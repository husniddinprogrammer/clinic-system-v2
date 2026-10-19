"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function createEmployee(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, "employees:manage")) {
    throw new Error("FORBIDDEN");
  }

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();

  if (!first_name || !last_name || !position) {
    throw new Error("Barcha maydonlar to'ldirilishi shart.");
  }

  const employee = await prisma.employee.create({
    data: { first_name, last_name, position },
  });

  await logActivity({
    type: "EMPLOYEE",
    action: "create",
    message: `Yangi xodim qo'shildi: ${first_name} ${last_name} (${position})`,
    userId: user.id,
    userName: user.full_name,
    entityId: employee.id,
  });

  revalidatePath("/employees");
}

export async function updateEmployee(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, "employees:manage")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();

  if (!id || !first_name || !last_name || !position) {
    throw new Error("Barcha maydonlar to'ldirilishi shart.");
  }

  await prisma.employee.update({
    where: { id },
    data: { first_name, last_name, position },
  });

  await logActivity({
    type: "EMPLOYEE",
    action: "update",
    message: `Xodim ma'lumotlari yangilandi: ${first_name} ${last_name}`,
    userId: user.id,
    userName: user.full_name,
    entityId: id,
  });

  revalidatePath("/employees");
}

export async function toggleEmployeeActive(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, "employees:manage")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  const is_active = formData.get("is_active") === "true";
  if (!id) throw new Error("Noto'g'ri ma'lumot.");

  const employee = await prisma.employee.update({
    where: { id },
    data: { is_active },
  });

  await logActivity({
    type: "EMPLOYEE",
    action: is_active ? "activate" : "deactivate",
    message: `Xodim ${is_active ? "aktivlashtirildi" : "deaktiv qilindi"}: ${employee.first_name} ${employee.last_name}`,
    userId: user.id,
    userName: user.full_name,
    entityId: id,
  });

  revalidatePath("/employees");
}
