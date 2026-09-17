"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import type { Role } from "@prisma/client";

function validRole(r: string): Role | null {
  if (r === "DOCTOR" || r === "NURSE") return r;
  return null;
}

export async function createUser(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "ADMIN") throw new Error("FORBIDDEN");

  const username = String(formData.get("username") ?? "").trim();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = validRole(String(formData.get("role") ?? ""));

  if (!username || !full_name || !password) {
    throw new Error("Barcha maydonlar to'ldirilishi shart.");
  }
  if (!role) throw new Error("Faqat DOCTOR yoki NURSE yaratish mumkin.");
  if (password.length < 4) throw new Error("Parol kamida 4 ta belgi bo'lishi shart.");

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("Bu username allaqachon mavjud.");

  const password_hash = await hashPassword(password);
  await prisma.user.create({
    data: { username, full_name, role, password_hash, is_active: true },
  });

  revalidatePath("/users");
}

export async function updateUser(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "ADMIN") throw new Error("FORBIDDEN");

  const id = Number(formData.get("id"));
  const full_name = String(formData.get("full_name") ?? "").trim();
  const role = validRole(String(formData.get("role") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!id || !full_name) throw new Error("Noto'g'ri ma'lumot.");
  if (role && !validRole(role as string)) throw new Error("Noto'g'ri role.");

  const data: { full_name: string; role?: Role; password_hash?: string } = {
    full_name,
  };
  if (role) data.role = role;
  if (password) {
    if (password.length < 4) throw new Error("Parol kamida 4 ta belgi bo'lishi shart.");
    data.password_hash = await hashPassword(password);
  }

  await prisma.user.update({ where: { id }, data });
  revalidatePath("/users");
}

export async function toggleUserActive(formData: FormData) {
  const admin = await requireUser();
  if (admin.role !== "ADMIN") throw new Error("FORBIDDEN");

  const id = Number(formData.get("id"));
  if (!id) throw new Error("Noto'g'ri ma'lumot.");
  if (id === admin.id) throw new Error("O'z hisobingizni o'chira olmaysiz.");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("User topilmadi.");
  if (user.role === "ADMIN") throw new Error("ADMIN holatini o'zgartirib bo'lmaydi.");

  await prisma.user.update({
    where: { id },
    data: { is_active: !user.is_active },
  });

  revalidatePath("/users");
}
