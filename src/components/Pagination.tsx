import Link from "next/link";

export const PAGE_SIZE = 20;

export function Pagination({
  page,
  totalPages,
  total,
  params,
  path,
}: {
  page: number;
  totalPages: number;
  total: number;
  params: Record<string, string | undefined>;
  path: string;
}) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
    }
    sp.set("page", String(p));
    return `${path}?${sp.toString()}`;
  }

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  const btn = "px-3 py-1.5 rounded-lg border text-sm transition-colors";

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50 flex-wrap gap-2">
      <span className="text-sm text-slate-500">
        Jami: <strong className="text-slate-700">{total}</strong> · Sahifa{" "}
        <strong className="text-slate-700">{page}</strong> / {totalPages}
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            className={`${btn} border-slate-300 text-slate-600 hover:bg-slate-100`}
          >
            ‹
          </Link>
        ) : (
          <span className={`${btn} border-slate-200 text-slate-300`}>‹</span>
        )}
        {start > 1 && (
          <>
            <Link
              href={href(1)}
              className={`${btn} border-slate-300 text-slate-600 hover:bg-slate-100`}
            >
              1
            </Link>
            {start > 2 && <span className="text-slate-400 px-1">…</span>}
          </>
        )}
        {pages.map((p) =>
          p === page ? (
            <span
              key={p}
              className={`${btn} bg-blue-600 border-blue-600 text-white font-medium`}
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={href(p)}
              className={`${btn} border-slate-300 text-slate-600 hover:bg-slate-100`}
            >
              {p}
            </Link>
          ),
        )}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && (
              <span className="text-slate-400 px-1">…</span>
            )}
            <Link
              href={href(totalPages)}
              className={`${btn} border-slate-300 text-slate-600 hover:bg-slate-100`}
            >
              {totalPages}
            </Link>
          </>
        )}
        {page < totalPages ? (
          <Link
            href={href(page + 1)}
            className={`${btn} border-slate-300 text-slate-600 hover:bg-slate-100`}
          >
            ›
          </Link>
        ) : (
          <span className={`${btn} border-slate-200 text-slate-300`}>›</span>
        )}
      </div>
    </div>
  );
}
