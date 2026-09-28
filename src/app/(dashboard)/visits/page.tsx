import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Topbar } from "@/components/Topbar";
import { VisitActions } from "@/components/VisitActions";
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
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className={`text-xs font-medium uppercase tracking-wide ${color}`}>
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-800 mt-2">{value}</div>
    </div>
  );
}

export default async function VisitsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const canCreate = hasPermission(user.role, "visits:create");
  const canEdit = hasPermission(user.role, "visits:edit");
  const canDelete = hasPermission(user.role, "visits:delete");
  const isAdmin = user.role === "ADMIN";

  const { from, to, page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);

  const where: { visit_date?: { gte?: Date; lte?: Date } } = {};
  if (from) where.visit_date = { ...where.visit_date, gte: new Date(from) };
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    where.visit_date = { ...where.visit_date, lte: toDate };
  }

  // Bugungi statistika
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayWhere = { visit_date: { gte: todayStart, lte: todayEnd } };

  const activeWhere = { ...where, is_active: true };
  const activeTodayWhere = { ...todayWhere, is_active: true };

  const [visits, visitsTotal, activeCount, filteredRevenue, doctors, todayVisits, todayRevenue] =
    await Promise.all([
      prisma.visit.findMany({
        where,
        orderBy: { visit_date: "desc" },
        include: {
          patient: { select: { id: true, full_name: true } },
          doctor: { select: { id: true, full_name: true } },
        },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.visit.count({ where }),
      prisma.visit.count({ where: activeWhere }),
      prisma.visit.aggregate({ where: activeWhere, _sum: { payment_amount: true } }),
      isAdmin
        ? prisma.user.findMany({
            where: { role: "DOCTOR", is_active: true },
            select: { id: true, full_name: true },
            orderBy: { full_name: "asc" },
          })
        : [],
      prisma.visit.count({ where: activeTodayWhere }),
      prisma.visit.aggregate({
        where: activeTodayWhere,
        _sum: { payment_amount: true },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(visitsTotal / PAGE_SIZE));
  const todaySum = Number(todayRevenue?._sum?.payment_amount ?? 0);
  const filteredSum = Number(filteredRevenue._sum.payment_amount ?? 0);

  return (
    <>
      <Topbar title="Tashriflar" />
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <StatCard
            label="Bugungi tashriflar"
            value={String(todayVisits)}
            color="text-emerald-600"
          />
          <StatCard
            label="Bugungi tushum"
            value={formatMoney(todaySum)}
            color="text-amber-600"
          />
        </div>

        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg"
            >
              Filtr
            </button>
            {(from || to) && (
              <Link
                href="/visits"
                className="text-sm text-blue-600 hover:underline px-2"
              >
                Tozalash
              </Link>
            )}
          </form>
          {canCreate && (
            <VisitActions
              mode="create"
              doctors={doctors}
              currentDoctorId={user.id}
              isAdmin={isAdmin}
            />
          )}
        </div>

        <div className="mb-3 text-sm text-slate-600">
          Jami tashriflar: <strong>{activeCount}</strong> · Umumiy to'lov:{" "}
          <strong>{formatMoney(filteredSum)}</strong>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3 font-medium">Bemor ID</th>
                <th className="px-4 py-3 font-medium">Bemor</th>
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Tashxis</th>
                <th className="px-4 py-3 font-medium">To'lov turi</th>
                <th className="px-4 py-3 font-medium text-right">To'lov</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    Tashriflar topilmadi.
                  </td>
                </tr>
              ) : (
                visits.map((v) => (
                  <tr
                    key={v.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 align-top ${
                      v.is_active ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatDate(v.visit_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      #{v.patient_id}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/patients/${v.patient_id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {v.patient.full_name}
                      </Link>
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
                    <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {formatMoney(Number(v.payment_amount ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          v.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {v.is_active ? "Aktiv" : "Deaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <VisitActions
                        mode="row"
                        visit={{
                          id: v.id,
                          patient_id: v.patient_id,
                          patient_name: v.patient.full_name,
                          doctor_id: v.doctor_id,
                          visit_date: toInputDate(v.visit_date),
                          diagnosis: v.diagnosis ?? "",
                          performed_work: v.performed_work ?? "",
                          payment_amount:
                            v.payment_amount != null
                              ? String(v.payment_amount)
                              : "",
                          payment_type: v.payment_type ?? "",
                          additional_info: v.additional_info ?? "",
                          is_active: v.is_active,
                        }}
                        doctors={doctors}
                        currentDoctorId={user.id}
                        isAdmin={isAdmin}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
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
            path="/visits"
          />
        </div>
      </main>
    </>
  );
}
