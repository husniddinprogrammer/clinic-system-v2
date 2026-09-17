"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { createUser, updateUser, toggleUserActive } from "@/app/actions/users";

type UserData = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

function UserForm({
  action,
  initial,
  onClose,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: UserData;
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
          Foydalanuvchi nomi
        </label>
        <input
          name="username"
          defaultValue={initial?.username ?? ""}
          required
          disabled={!!initial}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          F.I.Sh.
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
          Role
        </label>
        <select
          name="role"
          defaultValue={initial?.role ?? "DOCTOR"}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="DOCTOR">DOCTOR</option>
          <option value="NURSE">NURSE</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Parol {initial && "(bo'sh qoldirilsa o'zgarilmaydi)"}
        </label>
        <input
          name="password"
          type="text"
          defaultValue=""
          required={!initial}
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

export function UserActions({
  mode,
  user,
}: {
  mode: "create" | "row";
  user?: UserData;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (mode === "create") {
    return (
      <>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg whitespace-nowrap"
        >
          + Yangi user
        </button>
        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="Yangi doctor/hamshira qo'shish"
        >
          <UserForm action={createUser} onClose={() => setShowCreate(false)} />
        </Modal>
      </>
    );
  }

  if (!user) return null;

  function handleToggle() {
    setError("");
    const formData = new FormData();
    formData.set("id", String(user!.id));
    startTransition(async () => {
      try {
        await toggleUserActive(formData);
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
        {user.role !== "ADMIN" && (
          <button
            onClick={handleToggle}
            disabled={pending}
            className={`px-2.5 py-1.5 rounded text-xs font-medium ${
              user.is_active
                ? "text-amber-600 hover:bg-amber-50"
                : "text-emerald-600 hover:bg-emerald-50"
            }`}
          >
            {user.is_active ? "Deaktiv" : "Aktiv"}
          </button>
        )}
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 shadow-lg z-50">
          {error}
        </div>
      )}

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Userni tahrirlash"
      >
        <UserForm
          action={updateUser}
          initial={user}
          onClose={() => setShowEdit(false)}
        />
      </Modal>
    </>
  );
}
