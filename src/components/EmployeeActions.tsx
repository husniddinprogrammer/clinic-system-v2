"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import {
  createEmployee,
  updateEmployee,
  toggleEmployeeActive,
} from "@/app/actions/employees";

type EmployeeData = {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  is_active: boolean;
};

function EmployeeForm({
  action,
  initial,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: EmployeeData;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

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
          Ism
        </label>
        <input
          name="first_name"
          defaultValue={initial?.first_name ?? ""}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Familiya
        </label>
        <input
          name="last_name"
          defaultValue={initial?.last_name ?? ""}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Lavozimi
        </label>
        <input
          name="position"
          defaultValue={initial?.position ?? ""}
          placeholder="Masalan: Texnik, Oshpaz, Farrosh"
          required
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

export function EmployeeActions({
  mode,
  employee,
}: {
  mode: "create" | "row";
  employee?: EmployeeData;
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
          + Yangi xodim
        </button>
        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="Yangi xodim qo'shish"
        >
          <EmployeeForm
            action={createEmployee}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      </>
    );
  }

  if (!employee) return null;

  function handleToggle() {
    setError("");
    const formData = new FormData();
    formData.set("id", String(employee!.id));
    formData.set("is_active", String(!employee!.is_active));
    startTransition(async () => {
      try {
        await toggleEmployeeActive(formData);
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
        <button
          onClick={() => setShowEdit(true)}
          className="text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded text-xs font-medium"
        >
          Tahrirlash
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className={`px-2.5 py-1.5 rounded text-xs font-medium ${
            employee.is_active
              ? "text-amber-600 hover:bg-amber-50"
              : "text-emerald-600 hover:bg-emerald-50"
          }`}
        >
          {employee.is_active ? "Deaktiv" : "Aktivlashtirish"}
        </button>
      </div>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Xodimni tahrirlash"
      >
        <EmployeeForm
          action={updateEmployee}
          initial={employee}
          onClose={() => setShowEdit(false)}
        />
      </Modal>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title={
          employee.is_active
            ? "Xodimni deaktiv qilish"
            : "Xodimni aktivlashtirish"
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}
          <p className="text-sm text-slate-600">
            <strong>
              {employee.first_name} {employee.last_name}
            </strong>{" "}
            {employee.is_active
              ? "xodimini deaktiv qilmoqchimisiz? U yangi xarajat va texnik ishlarda tanlanmaydi, lekin eski yozuvlar saqlanadi."
              : "xodimini qayta aktiv qilmoqchimisiz?"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleToggle}
              disabled={pending}
              className={`flex-1 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg ${
                employee.is_active
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {pending
                ? "Bajarilmoqda..."
                : employee.is_active
                  ? "Deaktiv qilish"
                  : "Aktivlashtirish"}
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
