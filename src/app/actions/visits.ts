"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { formatMoney, formatPaymentType } from "@/lib/utils";
import type { PaymentType } from "@prisma/client";

function parseDate(value: string): Date {
  if (!value) return new Date();
  const d = new Date(value);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

function num(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function paymentType(value: string): PaymentType | null {
  if (value === "CASH" || value === "CARD" || value === "CLICK") return value;
  return null;
}

export async function createVisit(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "visits:create")) {
    throw new Error("FORBIDDEN");
  }

  const patient_id = Number(formData.get("patient_id"));
  let doctor_id = Number(formData.get("doctor_id"));
  // Doctor faqat o'z nomiga tashrif yarata oladi
  if (user.role === "DOCTOR") {
    doctor_id = user.id;
  }
  const visit_date = parseDate(String(formData.get("visit_date") ?? ""));
  const diagnosis = String(formData.get("diagnosis") ?? "").trim() || null;
  const performed_work = String(formData.get("performed_work") ?? "").trim() || null;
  const payment_amount = num(String(formData.get("payment_amount") ?? ""));
  const payment_type = paymentType(String(formData.get("payment_type") ?? ""));
  const additional_info = String(formData.get("additional_info") ?? "").trim() || null;

  if (!patient_id || !doctor_id) throw new Error("Bemor va doctor tanlanishi shart.");
  if (payment_amount === null) throw new Error("To'lov summasi kiritilishi shart.");
  if (payment_type === null) throw new Error("To'lov turi tanlanishi shart.");
  if (!diagnosis || !performed_work) {
    throw new Error("Tashxis va bajarilgan ishlar to'ldirilishi shart.");
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patient_id },
    select: { is_active: true, full_name: true },
  });
  if (!patient?.is_active) {
    throw new Error("Bu bemor deaktiv holatda — unga tashrif qo'shib bo'lmaydi.");
  }

  const visit = await prisma.visit.create({
    data: {
      patient_id,
      doctor_id,
      visit_date,
      diagnosis,
      performed_work,
      payment_amount,
      payment_type,
      additional_info,
    },
  });

  await logActivity({
    type: "VISIT",
    action: "create",
    message: `Yangi tashrif: ${patient.full_name} — ${diagnosis}`,
    userId: user.id,
    userName: user.full_name,
    entityId: visit.id,
  });
  if (payment_amount && payment_amount > 0) {
    await logActivity({
      type: "PAYMENT",
      action: "create",
      message: `To'lov qabul qilindi: ${formatMoney(payment_amount)} so'm (${formatPaymentType(payment_type)}) — ${patient.full_name}`,
      userId: user.id,
      userName: user.full_name,
      entityId: visit.id,
    });
  }

  revalidatePath("/visits");
  revalidatePath(`/patients/${patient_id}`);
  revalidatePath("/dashboard");
}

export async function updateVisit(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "visits:edit")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  const patient_id = Number(formData.get("patient_id"));
  let doctor_id = Number(formData.get("doctor_id"));
  if (user.role === "DOCTOR") {
    doctor_id = user.id;
  }
  const visit_date = parseDate(String(formData.get("visit_date") ?? ""));
  const diagnosis = String(formData.get("diagnosis") ?? "").trim() || null;
  const performed_work = String(formData.get("performed_work") ?? "").trim() || null;
  const payment_amount = num(String(formData.get("payment_amount") ?? ""));
  const payment_type = paymentType(String(formData.get("payment_type") ?? ""));
  const additional_info = String(formData.get("additional_info") ?? "").trim() || null;

  if (!id || !patient_id || !doctor_id) throw new Error("Noto'g'ri ma'lumot.");
  if (payment_amount === null) throw new Error("To'lov summasi kiritilishi shart.");
  if (payment_type === null) throw new Error("To'lov turi tanlanishi shart.");
  if (!diagnosis || !performed_work) {
    throw new Error("Tashxis va bajarilgan ishlar to'ldirilishi shart.");
  }

  const [oldVisit, patient] = await Promise.all([
    prisma.visit.findUnique({
      where: { id },
      select: {
        payment_amount: true,
        payment_type: true,
        doctor_id: true,
      },
    }),
    prisma.patient.findUnique({
      where: { id: patient_id },
      select: { full_name: true },
    }),
  ]);

  if (!oldVisit) throw new Error("Tashrif topilmadi.");
  if (user.role === "DOCTOR" && oldVisit.doctor_id !== user.id) {
    throw new Error("FORBIDDEN");
  }

  await prisma.visit.update({
    where: { id },
    data: {
      patient_id,
      doctor_id,
      visit_date,
      diagnosis,
      performed_work,
      payment_amount,
      payment_type,
      additional_info,
    },
  });

  await logActivity({
    type: "VISIT",
    action: "update",
    message: `Tashrif yangilandi: ${patient?.full_name ?? `#${patient_id}`} — ${diagnosis}`,
    userId: user.id,
    userName: user.full_name,
    entityId: id,
  });
  const paymentChanged =
    Number(oldVisit?.payment_amount ?? 0) !== payment_amount ||
    oldVisit?.payment_type !== payment_type;
  if (paymentChanged && payment_amount > 0) {
    await logActivity({
      type: "PAYMENT",
      action: "update",
      message: `To'lov o'zgartirildi: ${formatMoney(payment_amount)} so'm (${formatPaymentType(payment_type)}) — ${patient?.full_name ?? `#${patient_id}`}`,
      userId: user.id,
      userName: user.full_name,
      entityId: id,
    });
  }

  revalidatePath("/visits");
  revalidatePath(`/patients/${patient_id}`);
  revalidatePath("/dashboard");
}

export async function toggleVisitActive(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "visits:delete")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  const patient_id = Number(formData.get("patient_id"));
  const is_active = formData.get("is_active") === "true";
  if (!id) throw new Error("Noto'g'ri ma'lumot.");

  if (user.role === "DOCTOR") {
    const v = await prisma.visit.findUnique({
      where: { id },
      select: { doctor_id: true },
    });
    if (!v || v.doctor_id !== user.id) throw new Error("FORBIDDEN");
  }

  await prisma.visit.update({
    where: { id },
    data: { is_active },
  });

  await logActivity({
    type: "VISIT",
    action: is_active ? "activate" : "deactivate",
    message: `Tashrif #${id} ${is_active ? "aktivlashtirildi" : "deaktiv qilindi"}`,
    userId: user.id,
    userName: user.full_name,
    entityId: id,
  });

  revalidatePath("/visits");
  if (patient_id) revalidatePath(`/patients/${patient_id}`);
  revalidatePath("/dashboard");
}
