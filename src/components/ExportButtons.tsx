import { Icon } from "./icons";

export function ExportButtons({
  type,
  params = {},
}: {
  type: string;
  params?: Record<string, string | number | undefined>;
}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  const suffix = qs ? `?${qs}` : "";

  const btn =
    "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap";

  return (
    <div className="flex items-center gap-2">
      <a
        href={`/api/export/${type}${suffix}`}
        className={`${btn} border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
      >
        <Icon name="download" className="w-4 h-4" />
        Excel
      </a>
      <a
        href={`/print/${type}${suffix}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} border-slate-300 bg-white text-slate-600 hover:bg-slate-50`}
      >
        <Icon name="printer" className="w-4 h-4" />
        Chop etish
      </a>
    </div>
  );
}
