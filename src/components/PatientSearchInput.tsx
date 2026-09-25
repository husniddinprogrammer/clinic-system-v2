"use client";

import { useEffect, useRef, useState } from "react";

type PatientResult = { id: number; full_name: string; phone: string | null };

export function PatientSearchInput({
  initialId,
  initialName,
}: {
  initialId?: number;
  initialName?: string;
}) {
  const [query, setQuery] = useState(initialName ?? "");
  const [selectedId, setSelectedId] = useState<number | null>(
    initialId ?? null,
  );
  const [results, setResults] = useState<PatientResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (selectedId !== null) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.patients ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, selectedId]);

  function select(p: PatientResult) {
    setSelectedId(p.id);
    setQuery(p.full_name);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (selectedId !== null) setSelectedId(null);
        }}
        onFocus={() => {
          if (results.length) setOpen(true);
        }}
        placeholder="Bemor ismini yozing..."
        required
        autoComplete="off"
        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input type="hidden" name="patient_id" value={selectedId ?? ""} />
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {loading ? (
            <div className="px-3.5 py-2.5 text-sm text-slate-400">
              Qidirilmoqda...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3.5 py-2.5 text-sm text-slate-400">
              Bemor topilmadi
            </div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p)}
                className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between gap-2"
              >
                <span className="font-medium text-slate-800 truncate">
                  {p.full_name}
                </span>
                <span className="text-slate-400 text-xs whitespace-nowrap">
                  {p.phone ?? ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
