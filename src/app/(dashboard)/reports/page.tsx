import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getClinicSettings } from "@/lib/settings";
import { Topbar } from "@/components/Topbar";
import { ExportButtons } from "@/components/ExportButtons";
import { Pagination, PAGE_SIZE } from "@/components/Pagination";
import {
  formatDate,
  formatMoney,
  formatPaymentType,
  toInputDate,
} from "@/lib/utils";

function StatCard({
  label,
  value,
  sub,
  iconBg,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  iconBg: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500 truncate">
          {label}
        </div>
        <div className="text-xl font-bold text-slate-800 leading-tight truncate">
          {value}
        </div>
        {sub && <div className="text-xs text-slate-400 truncate">{sub}</div>}
      </div>
    </div>
  );
}

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "w-5 h-5",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!hasPermission(user, "reports:view")) {
    return (
      <>
        <Topbar title="Hisobotlar" />
        <main className="flex-1 p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            Bu sahifaga kirish uchun ruxsat yo&apos;q.
          </div>
        </main>
      </>
    );
  }

  const { from, to, page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  // Default to current month
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const fromDate = from ? new Date(from) : defaultFrom;
  const toDate = to ? new Date(to) : defaultTo;
  toDate.setHours(23, 59, 59, 999);

  const isAdmin = user.role === "ADMIN";

  const where = {
    visit_date: { gte: fromDate, lte: toDate },
    is_active: true,
    ...(isAdmin ? {} : { doctor_id: user.id }),
  };

  const [clinic, visits, visitsTotal, sumAgg, myPatientIds, byDoctorRows, byPaymentRows] =
    await Promise.all([
      getClinicSettings(),
      prisma.visit.findMany({
        where,
        orderBy: { id: "desc" },
        include: {
          patient: { select: { full_name: true } },
          doctor: { select: { full_name: true } },
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.visit.count({ where }),
      prisma.visit.aggregate({ where, _sum: { payment_amount: true } }),
      prisma.visit.findMany({
        where,
        select: { patient_id: true },
        distinct: ["patient_id"],
      }),
      isAdmin
        ? prisma.visit.groupBy({
            by: ["doctor_id"],
            where,
            _count: { _all: true },
            _sum: { payment_amount: true },
          })
        : [],
      prisma.visit.groupBy({
        by: ["payment_type"],
        where,
        _count: { _all: true },
        _sum: { payment_amount: true },
      }),
    ]);

  const newPatients = myPatientIds.length;

  const doctorIds = byDoctorRows.map((r) => r.doctor_id);
  const doctorNames = doctorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: doctorIds } },
        select: { id: true, full_name: true },
      })
    : [];
  const nameMap = new Map(doctorNames.map((d) => [d.id, d.full_name]));
  const byDoctor = byDoctorRows
    .map((r) => ({
      name: nameMap.get(r.doctor_id) ?? `#${r.doctor_id}`,
      count: r._count._all,
      sum: Number(r._sum.payment_amount ?? 0),
    }))
    .sort((a, b) => b.sum - a.sum);

  const totalPages = Math.max(1, Math.ceil(visitsTotal / PAGE_SIZE));
  const totalSum = Number(sumAgg._sum.payment_amount ?? 0);
  const avgCheck = visitsTotal > 0 ? totalSum / visitsTotal : 0;

  const paymentRows = byPaymentRows
    .map((p) => ({
      type: p.payment_type,
      count: p._count._all,
      sum: Number(p._sum.payment_amount ?? 0),
    }))
    .sort((a, b) => b.sum - a.sum);

  const periodText = `${formatDate(fromDate)} — ${formatDate(toDate)}`;
  const generatedAt = formatDate(new Date());

  return (
    <>
      <Topbar title="Hisobotlar" />
      <main className="flex-1 p-6 space-y-5">
        {/* Sarlavha kartochka */}
        <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-300">
              {clinic.name}
            </div>
            <h2 className="text-2xl font-bold mt-1">Moliyaviy hisobot</h2>
            <div className="text-sm text-slate-300 mt-1">
              Davr: {periodText}
            </div>
          </div>
          <div className="text-right text-xs text-slate-300">
            <div>Shakllantirildi: {generatedAt}</div>
            <div>{user.full_name}</div>
          </div>
        </div>

        {/* Filtr + eksport */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <form className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Dan:</span>
            <input
              type="date"
              name="from"
              defaultValue={from ?? toInputDate(fromDate)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">gacha:</span>
            <input
              type="date"
              name="to"
              defaultValue={to ?? toInputDate(toDate)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
            >
              Ko&apos;rsatish
            </button>
          </form>
          <ExportButtons
            type="reports"
            params={{ from: toInputDate(fromDate), to: toInputDate(toDate) }}
          />
        </div>

        {/* Statistikalar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Tashriflar"
            value={String(visitsTotal)}
            iconBg="bg-blue-100 text-blue-600"
            icon={
              <svg {...svgProps}>
                <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            }
          />
          <StatCard
            label={isAdmin ? "Bemorlar" : "Mening bemorlarim"}
            value={String(newPatients)}
            iconBg="bg-emerald-100 text-emerald-600"
            icon={
              <svg {...svgProps}>
                <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
              </svg>
            }
          />
          <StatCard
            label="Umumiy tushum"
            value={formatMoney(totalSum)}
            sub="so'm"
            iconBg="bg-amber-100 text-amber-600"
            icon={
              <svg {...svgProps}>
                <path d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="O'rtacha chek"
            value={formatMoney(avgCheck)}
            sub="so'm / tashrif"
            iconBg="bg-violet-100 text-violet-600"
            icon={
              <svg {...svgProps}>
                <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* To'lov turlari */}
          {paymentRows.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">
                To&apos;lov turlari bo&apos;yicha
              </h3>
              <div className="space-y-3">
                {paymentRows.map((p) => {
                  const pct = totalSum > 0 ? (p.sum / totalSum) * 100 : 0;
                  return (
                    <div key={p.type ?? "none"}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">
                          {formatPaymentType(p.type)}{" "}
                          <span className="text-slate-400">
                            ({p.count} ta)
                          </span>
                        </span>
                        <span className="font-medium text-slate-800">
                          {formatMoney(p.sum)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Doktorlar bo'yicha */}
          {isAdmin && byDoctor.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Doktorlar bo&apos;yicha
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 font-medium">Doktor</th>
                    <th className="py-2 font-medium text-right">Tashriflar</th>
                    <th className="py-2 font-medium text-right">Tushum</th>
                    <th className="py-2 font-medium text-right w-24">Ulush</th>
                  </tr>
                </thead>
                <tbody>
                  {byDoctor.map((e) => {
                    const pct = totalSum > 0 ? (e.sum / totalSum) * 100 : 0;
                    return (
                      <tr key={e.name} className="border-b border-slate-100">
                        <td className="py-2.5 text-slate-700">{e.name}</td>
                        <td className="py-2.5 text-right text-slate-600">
                          {e.count}
                        </td>
                        <td className="py-2.5 text-right font-medium text-slate-800">
                          {formatMoney(e.sum)}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 w-10 text-right">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tashriflar jadvali */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Tashriflar ro&apos;yxati
            </h3>
            <span className="text-xs text-slate-400">
              {visitsTotal} ta yozuv
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3 font-medium">Bemor</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Tashxis</th>
                <th className="px-4 py-3 font-medium">To&apos;lov turi</th>
                <th className="px-4 py-3 font-medium text-right">To&apos;lov</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    Tanlangan davrda tashriflar yo&apos;q.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatDate(v.visit_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {v.patient.full_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {v.doctor.full_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      {v.diagnosis ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatPaymentType(v.payment_type)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatMoney(Number(v.payment_amount ?? 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {visits.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td
                    colSpan={5}
                    className="px-4 py-3 text-right text-sm font-semibold text-slate-600"
                  >
                    JAMI:
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatMoney(totalSum)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={visitsTotal}
            params={{ from, to }}
            path="/reports"
          />
        </div>
      </main>
    </>
  );
}
