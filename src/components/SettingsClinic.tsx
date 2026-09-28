"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SettingsClinic({
  initialName,
  hasLogo,
  logoVersion,
}: {
  initialName: string;
  hasLogo: boolean;
  logoVersion: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("name", name);
        if (logo) formData.set("logo", logo);
        if (removeLogo) formData.set("remove_logo", "1");

        const res = await fetch("/api/settings", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          setMessage({ ok: true, text: "Sozlamalar saqlandi." });
          if (logoPreview) URL.revokeObjectURL(logoPreview);
          setLogo(null);
          setLogoPreview(null);
          setRemoveLogo(false);
          if (fileRef.current) fileRef.current.value = "";
          router.refresh();
        } else {
          setMessage({ ok: false, text: data.error ?? "Xatolik." });
        }
      } catch {
        setMessage({ ok: false, text: "Serverga ulanib bo'lmadi." });
      }
    });
  }

  const showLogo = (hasLogo || logoPreview) && !removeLogo;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-800 mb-4">
        Klinika ma'lumotlari
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
            Klinika nomi
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Logotip
          </label>
          <div className="flex items-center gap-4">
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={
                  logoPreview ?? `/api/settings?action=logo&v=${logoVersion}`
                }
                alt="Logo"
                className="w-14 h-14 rounded-lg object-cover border border-slate-200 bg-slate-50"
              />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                +
              </div>
            )}
            <div className="flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (logoPreview) URL.revokeObjectURL(logoPreview);
                  setLogo(f);
                  setLogoPreview(f ? URL.createObjectURL(f) : null);
                  setRemoveLogo(false);
                }}
                className="block w-full text-sm text-slate-600
                  file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                  file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer"
              />
              {hasLogo && !logo && (
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={removeLogo}
                    onChange={(e) => setRemoveLogo(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Logotipni o'chirish
                </label>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg"
        >
          {pending ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </form>
    </div>
  );
}
