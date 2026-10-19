"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import {
  formatLabWorkType,
  formatMoney,
  formatPaymentType,
} from "@/lib/utils";
import type { LabWorkType, PaymentType } from "@prisma/client";

function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function num(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function parseWorkType(value: string): LabWorkType | null {
  if (
    value === "ZIRCON" ||
    value === "MK_500" ||
    value === "CLITOY_300" ||
    value === "TITAN_250"
  ) {
    return value;
  }
  return null;
}

// null = hali to'lanmadi
function parsePayment(value: string): PaymentType | null {
  if (value === "CASH" || value === "CLICK") return value;
  return null;
}

export async function createLabWork(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, "labworks:create")) {
    throw new Error("FORBIDDEN");
  }

  const patient_id = Number(formData.get("patient_id"));
  const employee_id = Number(formData.get("employee_id"));
  const work_type = parseWorkType(String(formData.get("work_type") ?? ""));
  const work_date = parseDate(String(formData.get("work_date") ?? "").trim());
  const price = num(String(formData.get("price") ?? ""));
  const payment_type = parsePayment(String(formData.get("payment_type") ?? ""));

  if (!patient_id) throw new Error("Bemor tanlanishi shart.");
  if (!employee_id) throw new Error("Texnik xodim tanlanishi shart.");
  if (!work_type) throw new Error("Tish turi tanlanishi shart.");
  if (price === null || price <= 0) {
    throw new Error("Summa kiritilishi shart.");
  }

  const [patient, employee] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patient_id },
      select: { full_name: true, is_active: true },
    }),
    prisma.employee.findUnique({
      where: { id: employee_id },
      select: { first_name: true, last_name: true, is_active: true },
    }),
  ]);
  if (!patient?.is_active) {
    throw new Error("Bemor topilmadi yoki deaktiv holatda.");
  }
  if (!employee?.is_active) {
    throw new Error("Xodim topilmadi yoki deaktiv holatda.");
  }

  const labWork = await prisma.labWork.create({
    data: {
      patient_id,
      employee_id,
      work_type,
      work_date,
      price,
      payment_type,
    },
  });

  await logActivity({
    type: "LABWORK",
    action: "create",
    message: `Yangi texnik ish: ${patient.full_name} — ${formatLabWorkType(work_type)}, ${formatMoney(price)} so'm (${
      payment_type ? formatPaymentType(payment_type) : "To'lanmadi"
    }) — ${employee.first_name} ${employee.last_name}`,
    userId: user.id,
    userName: user.full_name,
    entityId: labWork.id,
  });

  revalidatePath("/labworks");
}

export async function updateLabWork(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, "labworks:edit")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  const patient_id = Number(formData.get("patient_id"));
  const employee_id = Number(formData.get("employee_id"));
  const work_type = parseWorkType(String(formData.get("work_type") ?? ""));
  const work_date = parseDate(String(formData.get("work_date") ?? "").trim());
  const price = num(String(formData.get("price") ?? ""));
  const payment_type = parsePayment(String(formData.get("payment_type") ?? ""));

  if (!id || !patient_id || !employee_id) {
    throw new Error("Noto'g'ri ma'lumot.");
  }
  if (!work_type) throw new Error("Tish turi tanlanishi shart.");
  if (price === null || price <= 0) {
    throw new Error("Summa kiritilishi shart.");
  }

  const [patient, employee] = await Promise.all([
    prisma.patient.findUnique({
      where: { id: patient_id },
      select: { full_name: true },
    }),
    prisma.employee.findUnique({
      where: { id: employee_id },
      select: { first_name: true, last_name: true },
    }),
  ]);
  if (!patient) throw new Error("Bemor topilmadi.");
  if (!employee) throw new Error("Xodim topilmadi.");

  await prisma.labWork.update({
    where: { id },
    data: {
      patient_id,
      employee_id,
      work_type,
      work_date,
      price,
      payment_type,
    },
  });

  await logActivity({
    type: "LABWORK",
    action: "update",
    message: `Texnik ish yangilandi: ${patient.full_name} — ${formatLabWorkType(work_type)}, ${formatMoney(price)} so'm`,
    userId: user.id,
    userName: user.full_name,
    entityId: id,
  });

  revalidatePath("/labworks");
}

export async function deleteLabWork(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, "labworks:delete")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  if (!id) throw new Error("Noto'g'ri ma'lumot.");

  const labWork = await prisma.labWork.findUnique({
    where: { id },
    select: {
      work_type: true,
      price: true,
      patient: { select: { full_name: true } },
    },
  });
  if (!labWork) throw new Error("Texnik ish topilmadi.");

  await prisma.labWork.delete({ where: { id } });

  await logActivity({
    type: "LABWORK",
    action: "delete",
    message: `Texnik ish o'chirildi: ${labWork.patient.full_name} — ${formatLabWorkType(labWork.work_type)}, ${formatMoney(Number(labWork.price))} so'm`,
    userId: user.id,
    userName: user.full_name,
    entityId: id,
  });

  revalidatePath("/labworks");
}
