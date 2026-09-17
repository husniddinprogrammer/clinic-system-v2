"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? "Import xatoligi." });
      } else {
        setResult({
          ok: true,
          message: `Import tugadi! Yangi bemorlar: ${data.importedPatients}, Tashriflar: ${data.importedVisits}, O'tkazib yuborilgan: ${data.skipped}, Jami qatorlar: ${data.totalRows}`,
        });
        if (fileRef.current) fileRef.current.value = "";
        setFile(null);
        router.refresh();
      }
    } catch {
      setResult({ ok: false, message: "Serverga ulanib bo'lmadi." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="Excel Import" />
      <main className="flex-1 p-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-2">
            Excel fayldan ma'lumot import qilish
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Excel ustunlari ketma-ketligi: №, Bemor ismi, Tug'ilgan yili,
            Telefon, Tashxis, Kelgan sana, Bajarilgan ishlar, To'lov summasi,
            Asoratlar, Qo'shimcha ma'lumotlar.
          </p>

          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600
                  file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0
                  file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer"
                required
              />
            </div>

            {result && (
              <div
                className={`text-sm rounded-lg px-4 py-3 ${
                  result.ok
                    ? "bg-green-50 border border-green-200 text-green-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                {result.message}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
            >
              {loading ? "Import qilinmoqda..." : "Import qilish"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-600">Eslatma:</p>
            <p>• Bir bemorning bir nechta yozuvi bo'lsa, bitta bemor va uning tashriflari alohida yaratiladi.</p>
            <p>• Takroriy bemorlar (ism + telefon) qayta yaratilmaydi.</p>
            <p>• Sana formatlari: Excel sana, dd.mm.yyyy, yyyy avtomatik aniqlanadi.</p>
            <p>• To'lov summalaridagi turli formatlar qo'llab-quvvatlanadi.</p>
          </div>
        </div>
      </main>
    </>
  );
}
