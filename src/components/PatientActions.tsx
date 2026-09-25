"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { createPatient, updatePatient, deletePatient } from "@/app/actions/patients";
import { PHONE_PATTERN, formatPhoneValue } from "@/lib/utils";

type PatientData = {
  id: number;
  full_name: string;
  birth_date: string;
  phone: string;
};

function PatientForm({
  action,
  initial,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: PatientData;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [phone, setPhone] = useState(() =>
    formatPhoneValue(initial?.phone ?? ""),
  );

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
          Ism Familiya
        </label>
        <input
          name="full_name"
          defaultValue={initial?.full_name ?? ""}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Tug'ilgan sana
        </label>
        <input
          type="date"
          name="birth_date"
          defaultValue={initial?.birth_date ?? ""}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Telefon
        </label>
        <input
          name="phone"
          value={phone}
          onChange={(e) => setPhone(formatPhoneValue(e.target.value))}
          placeholder="91 123 11 44"
          required
          inputMode="numeric"
          pattern={PHONE_PATTERN}
          title="Format: 91 123 11 44"
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

export function PatientActions({
  mode,
  patient,
  canEdit,
  canDelete,
}: {
  mode: "create" | "row";
  patient?: PatientData;
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
          + Yangi bemor
        </button>
        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="Yangi bemor qo'shish"
        >
          <PatientForm
            action={createPatient}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      </>
    );
  }

  if (!patient) return null;

  function handleDelete() {
    setError("");
    const formData = new FormData();
    formData.set("id", String(patient!.id));
    startTransition(async () => {
      try {
        await deletePatient(formData);
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
            O'chirish
          </button>
        )}
      </div>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Bemorni tahrirlash"
      >
        <PatientForm
          action={updatePatient}
          initial={patient}
          onClose={() => setShowEdit(false)}
        />
      </Modal>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Bemorni o'chirish"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}
          <p className="text-sm text-slate-600">
            <strong>{patient.full_name}</strong> bemorini o'chirmoqchimisiz?
            Bemorning barcha tashriflari ham o'chiriladi.
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
