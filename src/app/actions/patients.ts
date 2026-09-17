"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

function parseBirthDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function createPatient(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "patients:create")) {
    throw new Error("FORBIDDEN");
  }

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const birth_date = parseBirthDate(String(formData.get("birth_date") ?? ""));

  if (!full_name) throw new Error("Ism kiritilishi shart.");

  await prisma.patient.create({
    data: { full_name, phone, birth_date },
  });

  revalidatePath("/patients");
  revalidatePath("/dashboard");
}

export async function updatePatient(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "patients:edit")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const birth_date = parseBirthDate(String(formData.get("birth_date") ?? ""));

  if (!id || !full_name) throw new Error("Noto'g'ri ma'lumot.");

  await prisma.patient.update({
    where: { id },
    data: { full_name, phone, birth_date },
  });

  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);
}

export async function deletePatient(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user.role, "patients:delete")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  if (!id) throw new Error("Noto'g'ri ma'lumot.");

  await prisma.patient.delete({ where: { id } });

  revalidatePath("/patients");
  revalidatePath("/dashboard");
}
