"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { PatientSearchInput, PatientResult } from "./PatientSearchInput";
import { createVisit, updateVisit, deleteVisit } from "@/app/actions/visits";
import { createPatientInline } from "@/app/actions/patients";
import { toInputDate, formatPhoneValue } from "@/lib/utils";

export type DoctorOption = { id: number; full_name: string };

type VisitData = {
  id: number;
  patient_id: number;
  patient_name?: string;
  doctor_id: number;
  visit_date: string;
  diagnosis: string;
  performed_work: string;
  payment_amount: string;
  additional_info: string;
};

function formatPayment(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const dotIdx = cleaned.indexOf(".");
  const intPart = dotIdx === -1 ? cleaned : cleaned.slice(0, dotIdx);
  const decPart = dotIdx === -1 ? "" : cleaned.slice(dotIdx + 1).replace(/\./g, "").slice(0, 2);
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dotIdx === -1 ? formatted : `${formatted}.${decPart}`;
}

function VisitForm({
  action,
  initial,
  doctors,
  fixedPatientId,
  currentDoctorId,
  isAdmin,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: Partial<VisitData>;
  doctors: DoctorOption[];
  fixedPatientId?: number;
  currentDoctorId?: number;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [adding, startAdding] = useTransition();
  const [error, setError] = useState("");
  const [addError, setAddError] = useState("");
  const [payment, setPayment] = useState(() =>
    formatPayment(initial?.payment_amount ?? ""),
  );
  const [patient, setPatient] = useState<PatientResult | null>(
    initial?.patient_id
      ? {
          id: initial.patient_id,
          full_name: initial.patient_name ?? "",
          phone: null,
        }
      : null,
  );
  const [newName, setNewName] = useState("");
  const [newBirth, setNewBirth] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const defaultDoctor =
    initial?.doctor_id ?? (isAdmin ? 0 : currentDoctorId ?? 0);

  function handleAddPatient() {
    setAddError("");
    if (!newName.trim() || !newBirth || newPhone.replace(/\D/g, "").length !== 9) {
      setAddError("Barcha maydonlar to'ldirilishi shart.");
      return;
    }
    const fd = new FormData();
    fd.set("full_name", newName.trim());
    fd.set("birth_date", newBirth);
    fd.set("phone", newPhone);
    startAdding(async () => {
      try {
        const p = await createPatientInline(fd);
        setPatient(p);
        setNewName("");
        setNewBirth("");
        setNewPhone("");
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Xatolik.");
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!fixedPatientId && !patient) {
      setError("Bemorni tanlang.");
      return;
    }
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
    <form
      onSubmit={handleSubmit}
      className={`grid gap-5 ${fixedPatientId ? "grid-cols-2" : "grid-cols-3"}`}
    >
      {error && (
        <div className="col-span-full bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* 1-ustun: Bemor */}
      {fixedPatientId ? (
        <input type="hidden" name="patient_id" value={fixedPatientId} />
      ) : (
        <div className="flex flex-col">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bemor
            </label>
            <PatientSearchInput value={patient} onChange={setPatient} />
          </div>
          <input type="hidden" name="patient_id" value={patient?.id ?? ""} />

          <div
            className={`border-t border-slate-200 mt-4 pt-3 transition-opacity ${
              patient ? "opacity-50" : ""
            }`}
          >
            <p className="text-sm font-medium text-slate-700 mb-2.5">
              Yangi bemor qo'shish
            </p>
            {addError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mb-2.5">
                {addError}
              </div>
            )}
            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="Ism Familiya"
                required
                disabled={!!patient}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPatient();
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              <input
                type="date"
                required
                disabled={!!patient}
                value={newBirth}
                onChange={(e) => setNewBirth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              <input
                type="text"
                placeholder="91 123 11 44"
                inputMode="numeric"
                required
                disabled={!!patient}
                value={newPhone}
                onChange={(e) => setNewPhone(formatPhoneValue(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPatient();
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleAddPatient}
                disabled={adding || !!patient}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {adding ? "Qo'shilmoqda..." : "+ Bemor qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-ustun: Doctor, sana, to'lov */}
      <div className="flex flex-col gap-4">
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
            To'lov summasi
          </label>
          <input
            type="text"
            name="payment_amount"
            inputMode="numeric"
            required
            value={payment}
            onChange={(e) => setPayment(formatPayment(e.target.value))}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="100 000"
          />
        </div>
      </div>

      {/* 3-ustun: matn maydonlari */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tashxis
          </label>
          <textarea
            name="diagnosis"
            required
            defaultValue={initial?.diagnosis ?? ""}
            rows={3}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Bajarilgan ishlar
          </label>
          <textarea
            name="performed_work"
            required
            defaultValue={initial?.performed_work ?? ""}
            rows={3}
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
            rows={3}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="col-span-full flex gap-2 pt-1">
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
  fixedPatientId,
  currentDoctorId,
  isAdmin,
  canEdit,
  canDelete,
}: {
  mode: "create" | "row";
  visit?: VisitData;
  doctors: DoctorOption[];
  fixedPatientId?: number;
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
          wide
        >
          <VisitForm
            action={createVisit}
            doctors={doctors}
            fixedPatientId={fixedPatientId}
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
        wide
      >
        <VisitForm
          action={updateVisit}
          initial={visit}
          doctors={doctors}
          fixedPatientId={fixedPatientId}
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
