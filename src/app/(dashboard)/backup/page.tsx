"use client";

import { useState, useEffect, useCallback } from "react";
import { Topbar } from "@/components/Topbar";
import { formatDateTime } from "@/lib/utils";

type BackupFile = {
  name: string;
  size: number;
  created: string;
};

export default function BackupPage() {
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backup?action=list");
      const data = await res.json();
      if (res.ok) setFiles(data.files ?? []);
      else setMessage({ ok: false, text: data.error ?? "Xatolik" });
    } catch {
      setMessage({ ok: false, text: "Serverga ulanib bo'lmadi." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  async function createBackup() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backup" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ ok: true, text: `Backup yaratildi: ${data.file}` });
        loadFiles();
      } else {
        setMessage({ ok: false, text: data.error ?? "Xatolik" });
      }
    } catch {
      setMessage({ ok: false, text: "Serverga ulanib bo'lmadi." });
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup(name: string) {
    if (!confirm(`${name} faylidan restore qilishni xohlaysizmi?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", file: name }),
      });
      const data = await res.json();
      if (res.ok) setMessage({ ok: true, text: "Restore muvaffaqiyatli yakunlandi." });
      else setMessage({ ok: false, text: data.error ?? "Xatolik" });
    } catch {
      setMessage({ ok: false, text: "Serverga ulanib bo'lmadi." });
    } finally {
      setBusy(false);
    }
  }

  async function deleteBackup(name: string) {
    if (!confirm(`${name} faylini o'chirishni xohlaysizmi?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", file: name }),
      });
      if (res.ok) {
        setMessage({ ok: true, text: "Fayl o'chirildi." });
        loadFiles();
      }
    } catch {
      setMessage({ ok: false, text: "Xatolik" });
    } finally {
      setBusy(false);
    }
  }

  function download(name: string) {
    window.open(`/api/backup?action=download&file=${encodeURIComponent(name)}`, "_blank");
  }

  return (
    <>
      <Topbar title="Backup" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            PostgreSQL database backup va restore boshqaruvi.
          </p>
          <button
            onClick={createBackup}
            disabled={busy}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            {busy ? "..." : "Yangi backup"}
          </button>
        </div>

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

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">Fayl nomi</th>
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3 font-medium text-right">Hajmi</th>
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    Backup fayllari yo'q.
                  </td>
                </tr>
              ) : (
                files.map((f) => (
                  <tr
                    key={f.name}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {f.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDateTime(f.created)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {(f.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => download(f.name)}
                          className="text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded text-xs font-medium"
                        >
                          Yuklab olish
                        </button>
                        <button
                          onClick={() => restoreBackup(f.name)}
                          disabled={busy}
                          className="text-amber-600 hover:bg-amber-50 px-2.5 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => deleteBackup(f.name)}
                          disabled={busy}
                          className="text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded text-xs font-medium disabled:opacity-50"
                        >
                          O'chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
