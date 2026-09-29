"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/utils";

function PrintToolbar() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="print:hidden max-w-[210mm] mx-auto mb-4 flex items-center justify-between px-4">
      <span className="text-sm text-slate-500">
        Hujjat chop etishga tayyor
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          Chop etish
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 border border-slate-300 bg-white text-slate-700 text-sm rounded-lg hover:bg-slate-50"
        >
          Yopish
        </button>
      </div>
    </div>
  );
}

export function PrintDoc({
  clinicName,
  logoUrl,
  title,
  subtitle,
  userName,
  signature = true,
  children,
}: {
  clinicName: string;
  logoUrl?: string | null;
  title: string;
  subtitle?: ReactNode;
  userName?: string;
  signature?: boolean;
  children: ReactNode;
}) {
  const now = formatDateTime(new Date());

  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
      <PrintToolbar />
      <div className="mx-auto w-full max-w-[210mm] bg-white px-10 py-8 shadow-lg print:max-w-none print:shadow-none print:px-0 print:py-0">
        <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={clinicName}
              className="w-14 h-14 rounded-lg object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
              +
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold text-slate-900 leading-tight">
              {clinicName}
            </div>
            <div className="text-xs text-slate-500">
              Klinika boshqaruv tizimi
            </div>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            <div>Chop etildi: {now}</div>
            {userName && <div>Bajardi: {userName}</div>}
          </div>
        </div>

        <h1 className="text-center text-lg font-bold uppercase tracking-wide text-slate-900 mt-6 mb-1">
          {title}
        </h1>
        {subtitle && (
          <div className="text-center text-sm text-slate-600 mb-4">
            {subtitle}
          </div>
        )}
        {!subtitle && <div className="mb-4" />}

        {children}

        {signature && (
          <div className="mt-10 flex justify-between text-sm text-slate-700">
            <div>
              Mas&apos;ul shaxs:{" "}
              <span className="font-medium">{userName ?? "—"}</span>
            </div>
            <div className="flex items-end gap-2">
              <span>Imzo:</span>
              <span className="inline-block w-40 border-b border-slate-400" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PrintTable({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th
              key={i}
              className="border border-slate-400 bg-slate-100 px-2 py-1.5 text-left font-semibold text-slate-800"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function PrintTd({
  children,
  right = false,
  bold = false,
}: {
  children: ReactNode;
  right?: boolean;
  bold?: boolean;
}) {
  return (
    <td
      className={`border border-slate-300 px-2 py-1.5 align-top ${
        right ? "text-right" : "text-left"
      } ${bold ? "font-semibold" : ""}`}
    >
      {children}
    </td>
  );
}
