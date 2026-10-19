"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import {
  createExpense,
  updateExpense,
  deleteExpense,
} from "@/app/actions/expenses";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/utils";

type EmployeeOption = {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
};

type ExpenseData = {
  id: number;
  category: string;
  amount: string;
  description: string;
  date: string;
  employee_id: number | null;
};

const CATEGORY_KEYS = ["DOSTAVKA", "OVQAT", "ISHCHI", "BOSHQA"] as const;

function ExpenseForm({
  action,
  initial,
  employees,
  defaultDate,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: ExpenseData;
  employees: EmployeeOption[];
  defaultDate: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [category, setCategory] = useState(initial?.category ?? "BOSHQA");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await action(formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Xatolik yuz berdi.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Xarajat turi
        </label>
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>
              {EXPENSE_CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      {category === "ISHCHI" && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Xodim
          </label>
          <select
            name="employee_id"
            defaultValue={initial?.employee_id ?? ""}
            required
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>
              Xodimni tanlang...
            </option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} — {emp.position}
              </option>
            ))}
          </select>
          {employees.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Avval &quot;Xodimlar&quot; sahifasida xodim qo&apos;shing.
            </p>
          )}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Summa
        </label>
        <input
          name="amount"
          type="number"
          min="0"
          step="any"
          defaultValue={initial?.amount ?? ""}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Sana
        </label>
        <input
          name="date"
          type="date"
          defaultValue={initial?.date ?? defaultDate}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Tavsif
        </label>
        <input
          name="description"
          defaultValue={initial?.description ?? ""}
          placeholder="Ixtiyoriy"
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg"
        >
          {pending ? "Saqlanmoqda..." : "Saqlash"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
        >
          Bekor
        </button>
      </div>
    </form>
  );
}

export function ExpenseActions({
  mode,
  expense,
  employees,
  defaultDate,
  canEdit,
  canDelete,
}: {
  mode: "create" | "row";
  expense?: ExpenseData;
  employees: EmployeeOption[];
  defaultDate: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (mode === "create") {
    return (
      <>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg whitespace-nowrap"
        >
          + Xarajat qo&apos;shish
        </button>
        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="Yangi xarajat"
        >
          <ExpenseForm
            action={createExpense}
            employees={employees}
            defaultDate={defaultDate}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      </>
    );
  }

  if (!expense) return null;

  function handleDelete() {
    setError("");
    const formData = new FormData();
    formData.set("id", String(expense!.id));
    startTransition(async () => {
      try {
        await deleteExpense(formData);
        setShowDelete(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Xatolik.");
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {canEdit && (
          <button
            onClick={() => setShowEdit(true)}
            className="text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded text-xs font-medium"
          >
            Tahrirlash
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => setShowDelete(true)}
            className="text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded text-xs font-medium"
          >
            O&apos;chirish
          </button>
        )}
      </div>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Xarajatni tahrirlash"
      >
        <ExpenseForm
          action={updateExpense}
          initial={expense}
          employees={employees}
          defaultDate={defaultDate}
          onClose={() => setShowEdit(false)}
        />
      </Modal>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Xarajatni o'chirish"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Bu xarajatni o&apos;chirmoqchimisiz? Bu amalni qaytarib
            bo&apos;lmaydi.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={pending}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg"
            >
              {pending ? "O'chirilmoqda..." : "O'chirish"}
            </button>
            <button
              onClick={() => setShowDelete(false)}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
            >
              Bekor
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
