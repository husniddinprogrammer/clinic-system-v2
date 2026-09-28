import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Pagination, PAGE_SIZE } from "@/components/Pagination";
import { formatDate, formatMoney, toInputDate } from "@/lib/utils";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { from, to, page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  // Default to current month
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const fromDate = from ? new Date(from) : defaultFrom;
  const toDate = to ? new Date(to) : defaultTo;
  toDate.setHours(23, 59, 59, 999);

  const where = {
    visit_date: { gte: fromDate, lte: toDate },
    is_active: true,
  };

  const [visits, visitsTotal, sumAgg, newPatients, byDoctorRows] =
    await Promise.all([
      prisma.visit.findMany({
        where,
        orderBy: { visit_date: "desc" },
        include: {
          patient: { select: { full_name: true } },
          doctor: { select: { full_name: true } },
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.visit.count({ where }),
      prisma.visit.aggregate({ where, _sum: { payment_amount: true } }),
      prisma.patient.count({
        where: { created_at: { gte: fromDate, lte: toDate } },
      }),
      prisma.visit.groupBy({
        by: ["doctor_id"],
        where,
        _count: { _all: true },
        _sum: { payment_amount: true },
      }),
    ]);

  const doctorIds = byDoctorRows.map((r) => r.doctor_id);
  const doctorNames = doctorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: doctorIds } },
        select: { id: true, full_name: true },
      })
    : [];
  const nameMap = new Map(doctorNames.map((d) => [d.id, d.full_name]));
  const byDoctor = byDoctorRows.map((r) => ({
    name: nameMap.get(r.doctor_id) ?? `#${r.doctor_id}`,
    count: r._count._all,
    sum: Number(r._sum.payment_amount ?? 0),
  }));

  const totalPages = Math.max(1, Math.ceil(visitsTotal / PAGE_SIZE));
  const totalSum = Number(sumAgg._sum.payment_amount ?? 0);

  return (
    <>
      <Topbar title="Hisobotlar" />
      <main className="flex-1 p-6">
        <form className="flex items-center gap-2 mb-6">
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
            Ko'rsatish
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs font-medium uppercase text-blue-600">
              Tashriflar
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">
              {visitsTotal}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs font-medium uppercase text-emerald-600">
              Yangi bemorlar
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">
              {newPatients}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="text-xs font-medium uppercase text-amber-600">
              Umumiy to'lov
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">
              {formatMoney(totalSum)}
            </div>
          </div>
        </div>

        {byDoctor.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Doctorlar bo'yicha
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 font-medium">Doctor</th>
                  <th className="py-2 font-medium text-right">Tashriflar</th>
                  <th className="py-2 font-medium text-right">Tushum</th>
                </tr>
              </thead>
              <tbody>
                {byDoctor.map((e) => (
                  <tr key={e.name} className="border-b border-slate-100">
                    <td className="py-2.5 text-slate-700">{e.name}</td>
                    <td className="py-2.5 text-right text-slate-600">
                      {e.count}
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-800">
                      {formatMoney(e.sum)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3 font-medium">Bemor</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Tashxis</th>
                <th className="px-4 py-3 font-medium text-right">To'lov</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    Tanlangan davrda tashriflar yo'q.
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
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatMoney(Number(v.payment_amount ?? 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
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
