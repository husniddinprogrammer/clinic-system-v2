"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

type BackupFile = {
  name: string;
  size: number;
  created: string;
};

const BACKUP_PAGE_SIZE = 20;

export function SettingsBackup() {
  const router = useRouter();
  const restoreRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
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
      if (res.ok) {
        setMessage({ ok: true, text: "Restore muvaffaqiyatli yakunlandi." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: data.error ?? "Xatolik" });
      }
    } catch {
      setMessage({ ok: false, text: "Serverga ulanib bo'lmadi." });
    } finally {
      setBusy(false);
    }
  }

  async function restoreFromUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreFile) return;
    if (
      !confirm(
        `${restoreFile.name} faylidan restore qilishni xohlaysizmi? Joriy ma'lumotlar almashtiriladi.`,
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", restoreFile);
      const res = await fetch("/api/backup", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ ok: true, text: "Restore muvaffaqiyatli yakunlandi." });
        setRestoreFile(null);
        if (restoreRef.current) restoreRef.current.value = "";
        loadFiles();
        router.refresh();
      } else {
        setMessage({ ok: false, text: data.error ?? "Xatolik" });
      }
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
    window.open(
      `/api/backup?action=download&file=${encodeURIComponent(name)}`,
      "_blank",
    );
  }

  const totalPages = Math.max(1, Math.ceil(files.length / BACKUP_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageFiles = files.slice(
    (currentPage - 1) * BACKUP_PAGE_SIZE,
    currentPage * BACKUP_PAGE_SIZE,
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-800">
          Backup va Restore
        </h2>
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

      <form
        onSubmit={restoreFromUpload}
        className="mb-4 p-4 bg-slate-50 rounded-lg flex flex-wrap items-center gap-3"
      >
        <input
          ref={restoreRef}
          type="file"
          accept=".sql"
          onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
          className="flex-1 min-w-48 text-sm text-slate-600
            file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
            file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700
            hover:file:bg-amber-100 cursor-pointer"
        />
        <button
          type="submit"
          disabled={!restoreFile || busy}
          className="bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          Fayldan restore
        </button>
      </form>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
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
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-slate-400"
                >
                  Backup fayllari yo'q.
                </td>
              </tr>
            ) : (
              pageFiles.map((f) => (
                <tr
                  key={f.name}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800 break-all">
                    {f.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {formatDateTime(f.created)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-sm text-slate-500">
              Jami: <strong className="text-slate-700">{files.length}</strong> ·
              Sahifa <strong className="text-slate-700">{currentPage}</strong> /{" "}
              {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1.5 rounded-lg border text-sm ${
                    p === currentPage
                      ? "bg-blue-600 border-blue-600 text-white font-medium"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
