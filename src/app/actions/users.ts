"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { hasPermission, ALL_PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import type { Role } from "@prisma/client";

function validRole(r: string): Role | null {
  if (r === "DOCTOR") return r;
  return null;
}

function parsePermissions(formData: FormData): string[] | null {
  if (formData.get("permissions_present") !== "1") return null;
  const valid = new Set<string>(ALL_PERMISSIONS);
  return formData
    .getAll("permissions")
    .map(String)
    .filter((p) => valid.has(p));
}

export async function createUser(formData: FormData) {
  const admin = await requireUser();
  if (!hasPermission(admin, "users:manage")) throw new Error("FORBIDDEN");

  const username = String(formData.get("username") ?? "").trim();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = validRole(String(formData.get("role") ?? ""));
  const permissions = parsePermissions(formData);

  if (!username || !full_name || !password) {
    throw new Error("Barcha maydonlar to'ldirilishi shart.");
  }
  if (!role) throw new Error("Faqat DOCTOR yaratish mumkin.");
  if (password.length < 4) throw new Error("Parol kamida 4 ta belgi bo'lishi shart.");

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("Bu username allaqachon mavjud.");

  const password_hash = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      username,
      full_name,
      role,
      password_hash,
      is_active: true,
      ...(permissions !== null ? { permissions } : {}),
    },
  });

  await logActivity({
    type: "DOCTOR",
    action: "create",
    message: `Yangi doktor qo'shildi: ${full_name} (${username})`,
    userId: admin.id,
    userName: admin.full_name,
    entityId: created.id,
  });

  revalidatePath("/users");
}

export async function updateUser(formData: FormData) {
  const admin = await requireUser();
  if (!hasPermission(admin, "users:manage")) throw new Error("FORBIDDEN");

  const id = Number(formData.get("id"));
  const full_name = String(formData.get("full_name") ?? "").trim();
  const role = validRole(String(formData.get("role") ?? ""));
  const password = String(formData.get("password") ?? "");
  const permissions = parsePermissions(formData);

  if (!id || !full_name) throw new Error("Noto'g'ri ma'lumot.");
  if (role && !validRole(role as string)) throw new Error("Noto'g'ri role.");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new Error("User topilmadi.");

  const data: {
    full_name: string;
    role?: Role;
    password_hash?: string;
    permissions?: string[];
  } = {
    full_name,
  };
  // ADMIN role'ini bu yerda o'zgartirib bo'lmaydi
  if (role && target.role !== "ADMIN") data.role = role;
  // ADMIN'ning ruxsatlari har doim to'liq — faqat DOCTOR uchun saqlanadi
  if (permissions !== null && target.role !== "ADMIN") {
    data.permissions = permissions;
  }
  if (password) {
    if (password.length < 4) throw new Error("Parol kamida 4 ta belgi bo'lishi shart.");
    data.password_hash = await hashPassword(password);
  }

  await prisma.user.update({ where: { id }, data });

  await logActivity({
    type: "DOCTOR",
    action: "update",
    message: `Doktor ma'lumotlari yangilandi: ${full_name}${password ? " (parol o'zgartirildi)" : ""}`,
    userId: admin.id,
    userName: admin.full_name,
    entityId: id,
  });

  revalidatePath("/users");
}

export async function toggleUserActive(formData: FormData) {
  const admin = await requireUser();
  if (!hasPermission(admin, "users:manage")) throw new Error("FORBIDDEN");

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

  await logActivity({
    type: "DOCTOR",
    action: !user.is_active ? "activate" : "deactivate",
    message: `Doktor ${!user.is_active ? "aktivlashtirildi" : "deaktiv qilindi"}: ${user.full_name}`,
    userId: admin.id,
    userName: admin.full_name,
    entityId: id,
  });

  revalidatePath("/users");
}
