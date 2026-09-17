"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { createVisit, updateVisit, deleteVisit } from "@/app/actions/visits";
import { toInputDate } from "@/lib/utils";

export type DoctorOption = { id: number; full_name: string };
export type PatientOption = { id: number; full_name: string };

type VisitData = {
  id: number;
  patient_id: number;
  doctor_id: number;
  visit_date: string;
  diagnosis: string;
  performed_work: string;
  payment_amount: string;
  complications: string;
  additional_info: string;
};

function VisitForm({
  action,
  initial,
  doctors,
  patients,
  currentDoctorId,
  isAdmin,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: Partial<VisitData>;
  doctors: DoctorOption[];
  patients?: PatientOption[];
  currentDoctorId?: number;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const defaultDoctor =
    initial?.doctor_id ?? (isAdmin ? 0 : currentDoctorId ?? 0);

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

      {patients && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Bemor
          </label>
          <select
            name="patient_id"
            defaultValue={String(initial?.patient_id ?? "")}
            required
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>
              Bemor tanlang
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      )}
      {!patients && initial?.patient_id && (
        <input type="hidden" name="patient_id" value={initial.patient_id} />
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Doctor
        </label>
        <select
          name="doctor_id"
          defaultValue={String(defaultDoctor)}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!isAdmin}
        >
          {!isAdmin && <option value={String(currentDoctorId)}>Men</option>}
          {isAdmin &&
            doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
        </select>
        {!isAdmin && currentDoctorId && (
          <input type="hidden" name="doctor_id" value={currentDoctorId} />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Kelgan sana
        </label>
        <input
          type="date"
          name="visit_date"
          defaultValue={initial?.visit_date ?? toInputDate(new Date())}
          required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Tashxis
        </label>
        <textarea
          name="diagnosis"
          defaultValue={initial?.diagnosis ?? ""}
          rows={2}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Bajarilgan ishlar
        </label>
        <textarea
          name="performed_work"
          defaultValue={initial?.performed_work ?? ""}
          rows={2}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          To'lov summasi
        </label>
        <input
          type="text"
          name="payment_amount"
          defaultValue={initial?.payment_amount ?? ""}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Kasallik asoratlari
        </label>
        <textarea
          name="complications"
          defaultValue={initial?.complications ?? ""}
          rows={2}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Qo'shimcha ma'lumotlar
        </label>
        <textarea
          name="additional_info"
          defaultValue={initial?.additional_info ?? ""}
          rows={2}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

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

export function VisitActions({
  mode,
  visit,
  doctors,
  patients,
  currentDoctorId,
  isAdmin,
  canEdit,
  canDelete,
}: {
  mode: "create" | "row";
  visit?: VisitData;
  doctors: DoctorOption[];
  patients?: PatientOption[];
  currentDoctorId?: number;
  isAdmin: boolean;
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
          + Yangi tashrif
        </button>
        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="Yangi tashrif qo'shish"
        >
          <VisitForm
            action={createVisit}
            doctors={doctors}
            patients={patients}
            currentDoctorId={currentDoctorId}
            isAdmin={isAdmin}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      </>
    );
  }

  if (!visit) return null;

  function handleDelete() {
    setError("");
    const formData = new FormData();
    formData.set("id", String(visit!.id));
    formData.set("patient_id", String(visit!.patient_id));
    startTransition(async () => {
      try {
        await deleteVisit(formData);
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
        title="Tashrifni tahrirlash"
      >
        <VisitForm
          action={updateVisit}
          initial={visit}
          doctors={doctors}
          currentDoctorId={currentDoctorId}
          isAdmin={isAdmin}
          onClose={() => setShowEdit(false)}
        />
      </Modal>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Tashrifni o'chirish"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Ushbu tashrifni o'chirmoqchimisiz?
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
