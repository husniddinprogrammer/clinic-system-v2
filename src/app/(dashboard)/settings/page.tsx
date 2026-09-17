"use client";

import { useState, useTransition } from "react";
import { Topbar } from "@/components/Topbar";

export default function SettingsPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 4) {
      setMessage({ ok: false, text: "Parol kamida 4 ta belgi bo'lishi shart." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ ok: false, text: "Parollar mos kelmadi." });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setMessage({ ok: true, text: "Parol muvaffaqiyatli o'zgartirildi." });
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
        } else {
          setMessage({ ok: false, text: data.error ?? "Xatolik." });
        }
      } catch {
        setMessage({ ok: false, text: "Serverga ulanib bo'lmadi." });
      }
    });
  }

  return (
    <>
      <Topbar title="Sozlamalar" />
      <main className="flex-1 p-6 max-w-lg">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Parolni o'zgartirish
          </h2>

          {message && (
            <div
              className={`mb-4 text-sm rounded-lg px-4 py-3 ${
                message.ok
                  ? "bg-green-50 border border-green-200 text-green-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Joriy parol
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Yangi parol
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Yangi parol (qayta)
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
            >
              {pending ? "Saqlanmoqda..." : "Parolni o'zgartirish"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mt-4">
          <h2 className="text-base font-semibold text-slate-800 mb-3">
            Tizim ma'lumotlari
          </h2>
          <div className="text-sm text-slate-600 space-y-1.5">
            <div>
              <span className="text-slate-400">Database: </span>PostgreSQL 16
            </div>
            <div>
              <span className="text-slate-400">ORM: </span>Prisma 6
            </div>
            <div>
              <span className="text-slate-400">Framework: </span>Next.js 16
            </div>
            <div>
              <span className="text-slate-400">Rejim: </span>Offline / Local
              Network
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
