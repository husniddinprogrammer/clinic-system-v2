"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, hashPassword } from "@/lib/auth";

export async function createDoctor(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "ADMIN") throw new Error("FORBIDDEN");

  const username = String(formData.get("username") ?? "").trim();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !full_name || !password) {
    throw new Error("Barcha maydonlar to'ldirilishi shart.");
  }
  if (password.length < 4) {
    throw new Error("Parol kamida 4 ta belgi bo'lishi shart.");
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("Bu username allaqachon mavjud.");

  const password_hash = await hashPassword(password);
  await prisma.user.create({
    data: {
      username,
      full_name,
      role: "DOCTOR",
      password_hash,
      is_active: true,
    },
  });

  revalidatePath("/doctors");
  revalidatePath("/users");
}

export async function toggleDoctorActive(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "ADMIN") throw new Error("FORBIDDEN");

  const id = Number(formData.get("id"));
  if (!id) throw new Error("Noto'g'ri ma'lumot.");

  const doctor = await prisma.user.findUnique({ where: { id } });
  if (!doctor || doctor.role !== "DOCTOR") throw new Error("Doktor topilmadi.");

  await prisma.user.update({
    where: { id },
    data: { is_active: !doctor.is_active },
  });

  revalidatePath("/doctors");
}
