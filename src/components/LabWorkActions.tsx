"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { PatientSearchInput, type PatientResult } from "./PatientSearchInput";
import {
  createLabWork,
  updateLabWork,
  deleteLabWork,
} from "@/app/actions/labworks";
import { LABWORK_TYPE_LABELS } from "@/lib/utils";

type EmployeeOption = {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
};

type LabWorkData = {
  id: number;
  patient: PatientResult;
  employee_id: number;
  work_type: string;
  work_date: string;
  price: string;
  payment_type: string | null;
};

const WORK_TYPE_KEYS = ["ZIRCON", "MK_500", "CLITOY_300", "TITAN_250"] as const;

const PAYMENT_OPTIONS = [
  { value: "CASH", label: "Naqd" },
  { value: "CLICK", label: "Click" },
  { value: "", label: "Hali to'lanmadi" },
];

function LabWorkForm({
  action,
  initial,
  employees,
  defaultDate,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: LabWorkData;
  employees: EmployeeOption[];
  defaultDate: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [patient, setPatient] = useState<PatientResult | null>(
    initial?.patient ?? null,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!patient) {
      setError("Bemor tanlanishi shart.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("patient_id", String(patient.id));
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
          Bemor
        </label>
        <PatientSearchInput value={patient} onChange={setPatient} />
        {patient?.phone && (
          <p className="text-xs text-slate-500 mt-1">
            Telefon: {patient.phone}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Tish turi
        </label>
        <select
          name="work_type"
          defaultValue={initial?.work_type ?? "ZIRCON"}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {WORK_TYPE_KEYS.map((key) => (
            <option key={key} value={key}>
              {LABWORK_TYPE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Texnik xodim
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
            Avval &quot;Xodimlar&quot; sahifasida texnik xodim qo&apos;shing.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Sana
          </label>
          <input
            name="work_date"
            type="date"
            defaultValue={initial?.work_date ?? defaultDate}
            required
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Summa
          </label>
          <input
            name="price"
            type="number"
            min="0"
            step="any"
            defaultValue={initial?.price ?? ""}
            required
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          To&apos;lov
        </label>
        <div className="flex gap-2">
          {PAYMENT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex-1 flex items-center gap-2 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm cursor-pointer has-checked:border-blue-500 has-checked:bg-blue-50"
            >
              <input
                type="radio"
                name="payment_type"
                value={opt.value}
                defaultChecked={
                  (initial?.payment_type ?? "") === opt.value
                }
                className="accent-blue-600"
              />
              {opt.label}
            </label>
          ))}
        </div>
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

export function LabWorkActions({
  mode,
  labWork,
  employees,
  defaultDate,
  canEdit,
  canDelete,
}: {
  mode: "create" | "row";
  labWork?: LabWorkData;
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
          + Yangi ish
        </button>
        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="Yangi texnik ish"
        >
          <LabWorkForm
            action={createLabWork}
            employees={employees}
            defaultDate={defaultDate}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      </>
    );
  }

  if (!labWork) return null;

  function handleDelete() {
    setError("");
    const formData = new FormData();
    formData.set("id", String(labWork!.id));
    startTransition(async () => {
      try {
        await deleteLabWork(formData);
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
        title="Texnik ishni tahrirlash"
      >
        <LabWorkForm
          action={updateLabWork}
          initial={labWork}
          employees={employees}
          defaultDate={defaultDate}
          onClose={() => setShowEdit(false)}
        />
      </Modal>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Texnik ishni o'chirish"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}
          <p className="text-sm text-slate-600">
            <strong>{labWork.patient.full_name}</strong> uchun bu texnik ishni
            o&apos;chirmoqchimisiz? Bu amalni qaytarib bo&apos;lmaydi.
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
