"use client";

import { useEffect, useRef, useState } from "react";

export type PatientResult = {
  id: number;
  full_name: string;
  phone: string | null;
};

export function PatientSearchInput({
  value,
  onChange,
}: {
  value: PatientResult | null;
  onChange: (p: PatientResult | null) => void;
}) {
  const [query, setQuery] = useState(value?.full_name ?? "");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tashqaridan bemor tanlanganda (masalan, ichki formadan) inputni yangilash
  useEffect(() => {
    if (value) setQuery(value.full_name);
  }, [value]);

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
    if (value) return;
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
        setActiveIndex(-1);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, value]);

  // Klaviatura bilan tanlangan elementni ko'rinadigan qilish
  useEffect(() => {
    if (activeIndex >= 0) {
      listRef.current?.children[activeIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeIndex]);

  function select(p: PatientResult) {
    onChange(p);
    setQuery(p.full_name);
    setOpen(false);
    setResults([]);
    setActiveIndex(-1);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!open || results.length === 0) return;
      e.preventDefault();
      setActiveIndex((i) =>
        e.key === "ArrowDown"
          ? Math.min(i + 1, results.length - 1)
          : Math.max(i - 1, 0),
      );
    } else if (e.key === "Enter") {
      if (open && results.length > 0) {
        e.preventDefault();
        select(results[activeIndex >= 0 ? activeIndex : 0]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onChange(null);
        }}
        onFocus={() => {
          if (results.length) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Bemor ismini yozing..."
        required
        autoComplete="off"
        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          value ? "border-emerald-400 bg-emerald-50 pr-9" : "border-slate-300"
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          title="Bemorni o'chirish"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 text-lg leading-none"
        >
          ×
        </button>
      )}
      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          {loading ? (
            <div className="px-3.5 py-2.5 text-sm text-slate-400">
              Qidirilmoqda...
            </div>
          ) : results.length === 0 ? (
            <div className="px-3.5 py-2.5 text-sm text-slate-400">
              Bemor topilmadi
            </div>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => select(p)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between gap-2 ${
                  i === activeIndex ? "bg-blue-100" : "hover:bg-blue-50"
                }`}
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
