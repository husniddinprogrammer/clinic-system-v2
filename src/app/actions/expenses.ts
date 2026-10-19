"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";
import { formatExpenseCategory, formatMoney } from "@/lib/utils";
import type { ExpenseCategory } from "@prisma/client";

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

function parseCategory(value: string): ExpenseCategory | null {
  if (
    value === "DOSTAVKA" ||
    value === "OVQAT" ||
    value === "ISHCHI" ||
    value === "BOSHQA"
  ) {
    return value;
  }
  return null;
}

export async function createExpense(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, "expenses:create")) {
    throw new Error("FORBIDDEN");
  }

  const category = parseCategory(String(formData.get("category") ?? ""));
  const amount = num(String(formData.get("amount") ?? ""));
  const description = String(formData.get("description") ?? "").trim() || null;
  const date = parseDate(String(formData.get("date") ?? "").trim());
  const employee_id = Number(formData.get("employee_id")) || null;

  if (!category) throw new Error("Xarajat turi tanlanishi shart.");
  if (amount === null || amount <= 0) {
    throw new Error("Summa kiritilishi shart.");
  }
  if (category === "ISHCHI" && !employee_id) {
    throw new Error("Xodim tanlanishi shart.");
  }

  const employee = employee_id
    ? await prisma.employee.findUnique({
        where: { id: employee_id },
        select: { first_name: true, last_name: true, is_active: true },
      })
    : null;
  if (employee_id && !employee) throw new Error("Xodim topilmadi.");

  const expense = await prisma.expense.create({
    data: {
      category,
      amount,
      description,
      date,
      employee_id: category === "ISHCHI" ? employee_id : null,
    },
  });

  await logActivity({
    type: "EXPENSE",
    action: "create",
    message: `Yangi xarajat: ${formatExpenseCategory(category)} — ${formatMoney(amount)} so'm${
      employee ? ` (${employee.first_name} ${employee.last_name})` : ""
    }`,
    userId: user.id,
    userName: user.full_name,
    entityId: expense.id,
  });

  revalidatePath("/expenses");
}

export async function updateExpense(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, "expenses:edit")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  const category = parseCategory(String(formData.get("category") ?? ""));
  const amount = num(String(formData.get("amount") ?? ""));
  const description = String(formData.get("description") ?? "").trim() || null;
  const date = parseDate(String(formData.get("date") ?? "").trim());
  const employee_id = Number(formData.get("employee_id")) || null;

  if (!id) throw new Error("Noto'g'ri ma'lumot.");
  if (!category) throw new Error("Xarajat turi tanlanishi shart.");
  if (amount === null || amount <= 0) {
    throw new Error("Summa kiritilishi shart.");
  }
  if (category === "ISHCHI" && !employee_id) {
    throw new Error("Xodim tanlanishi shart.");
  }

  await prisma.expense.update({
    where: { id },
    data: {
      category,
      amount,
      description,
      date,
      employee_id: category === "ISHCHI" ? employee_id : null,
    },
  });

  await logActivity({
    type: "EXPENSE",
    action: "update",
    message: `Xarajat yangilandi: ${formatExpenseCategory(category)} — ${formatMoney(amount)} so'm`,
    userId: user.id,
    userName: user.full_name,
    entityId: id,
  });

  revalidatePath("/expenses");
}

export async function deleteExpense(formData: FormData) {
  const user = await requireUser();
  if (!hasPermission(user, "expenses:delete")) {
    throw new Error("FORBIDDEN");
  }

  const id = Number(formData.get("id"));
  if (!id) throw new Error("Noto'g'ri ma'lumot.");

  const expense = await prisma.expense.findUnique({
    where: { id },
    select: { category: true, amount: true },
  });
  if (!expense) throw new Error("Xarajat topilmadi.");

  await prisma.expense.delete({ where: { id } });

  await logActivity({
    type: "EXPENSE",
    action: "delete",
    message: `Xarajat o'chirildi: ${formatExpenseCategory(expense.category)} — ${formatMoney(Number(expense.amount))} so'm`,
    userId: user.id,
    userName: user.full_name,
    entityId: id,
  });

  revalidatePath("/expenses");
}
