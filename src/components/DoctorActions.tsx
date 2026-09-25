"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { createDoctor, toggleDoctorActive } from "@/app/actions/doctors";

function DoctorForm({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createDoctor(formData);
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
          F.I.Sh.
        </label>
        <input
          name="full_name"
          required
          placeholder="Dr. Alimov Jasur"
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Foydalanuvchi nomi (login)
        </label>
        <input
          name="username"
          required
          placeholder="dr.alimov"
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Parol
        </label>
        <input
          name="password"
          type="text"
          required
          placeholder="Kamida 4 ta belgi"
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
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

export function AddDoctorButton() {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        onClick={() => setShow(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg whitespace-nowrap"
      >
        + Yangi doktor
      </button>
      <Modal open={show} onClose={() => setShow(false)} title="Yangi doktor qo'shish">
        <DoctorForm onClose={() => setShow(false)} />
      </Modal>
    </>
  );
}

export function DoctorToggleButton({
  id,
  isActive,
}: {
  id: number;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleToggle() {
    setError("");
    const formData = new FormData();
    formData.set("id", String(id));
    startTransition(async () => {
      try {
        await toggleDoctorActive(formData);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Xatolik.");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={handleToggle}
        disabled={pending}
        className={`px-2.5 py-1.5 rounded text-xs font-medium ${
          isActive
            ? "text-amber-600 hover:bg-amber-50"
            : "text-emerald-600 hover:bg-emerald-50"
        }`}
      >
        {isActive ? "Deaktiv" : "Aktiv"}
      </button>
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
