"use client";

export function PeriodFilter({
  period,
  sfrom,
  sto,
  from,
  to,
}: {
  period: string;
  sfrom?: string;
  sto?: string;
  from?: string;
  to?: string;
}) {
  function maybeSubmit(e: React.ChangeEvent<HTMLInputElement>) {
    const form = e.currentTarget.form;
    if (!form) return;
    const f = (
      form.elements.namedItem("sfrom") as HTMLInputElement | null
    )?.value;
    const t = (form.elements.namedItem("sto") as HTMLInputElement | null)
      ?.value;
    if (f && t) form.requestSubmit();
  }

  return (
    <form className="flex items-center gap-2 flex-wrap">
      <select
        name="period"
        defaultValue={period}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="day">Bugun</option>
        <option value="week">Hafta</option>
        <option value="month">Oy</option>
        <option value="custom">Sana tanlash</option>
      </select>
      {period === "custom" && (
        <>
          <input
            type="date"
            name="sfrom"
            defaultValue={sfrom}
            onChange={maybeSubmit}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400">—</span>
          <input
            type="date"
            name="sto"
            defaultValue={sto}
            onChange={maybeSubmit}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </>
      )}
      {/* Jadval filtrini saqlab qolish */}
      <input type="hidden" name="from" value={from ?? ""} />
      <input type="hidden" name="to" value={to ?? ""} />
    </form>
  );
}
