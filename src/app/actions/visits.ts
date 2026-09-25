"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

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

export async function createVisit(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "visits:create")) {
    throw new Error("FORBIDDEN");
  }

  const patient_id = Number(formData.get("patient_id"));
  let doctor_id = Number(formData.get("doctor_id"));
  // Doctor auto-selects own account
  if (!doctor_id && user.role === "DOCTOR") {
    doctor_id = user.id;
  }
  const visit_date = parseDate(String(formData.get("visit_date") ?? ""));
  const diagnosis = String(formData.get("diagnosis") ?? "").trim() || null;
  const performed_work = String(formData.get("performed_work") ?? "").trim() || null;
  const payment_amount = num(String(formData.get("payment_amount") ?? ""));
  const additional_info = String(formData.get("additional_info") ?? "").trim() || null;

  if (!patient_id || !doctor_id) throw new Error("Bemor va doctor tanlanishi shart.");
  if (payment_amount === null) throw new Error("To'lov summasi kiritilishi shart.");

  await prisma.visit.create({
    data: {
      patient_id,
      doctor_id,
      visit_date,
      diagnosis,
      performed_work,
      payment_amount,
      additional_info,
    },
  });

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
  const doctor_id = Number(formData.get("doctor_id"));
  const visit_date = parseDate(String(formData.get("visit_date") ?? ""));
  const diagnosis = String(formData.get("diagnosis") ?? "").trim() || null;
  const performed_work = String(formData.get("performed_work") ?? "").trim() || null;
  const payment_amount = num(String(formData.get("payment_amount") ?? ""));
  const additional_info = String(formData.get("additional_info") ?? "").trim() || null;

  if (!id || !patient_id || !doctor_id) throw new Error("Noto'g'ri ma'lumot.");
  if (payment_amount === null) throw new Error("To'lov summasi kiritilishi shart.");

  await prisma.visit.update({
    where: { id },
    data: {
      patient_id,
      doctor_id,
      visit_date,
      diagnosis,
      performed_work,
      payment_amount,
      additional_info,
    },
  });

  revalidatePath("/visits");
  revalidatePath(`/patients/${patient_id}`);
  revalidatePath("/dashboard");
}

export async function deleteVisit(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "visits:delete")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  const patient_id = Number(formData.get("patient_id"));
  if (!id) throw new Error("Noto'g'ri ma'lumot.");

  await prisma.visit.delete({ where: { id } });

  revalidatePath("/visits");
  if (patient_id) revalidatePath(`/patients/${patient_id}`);
  revalidatePath("/dashboard");
}
