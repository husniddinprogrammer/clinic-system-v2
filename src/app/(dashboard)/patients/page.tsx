import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { PatientActions } from "@/components/PatientActions";
import { formatDate, formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { Pagination, PAGE_SIZE } from "@/components/Pagination";
import type { Prisma } from "@prisma/client";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const canCreate = hasPermission(user.role, "patients:create");
  const canEdit = hasPermission(user.role, "patients:edit");
  const canDelete = hasPermission(user.role, "patients:delete");
  const isAdmin = user.role === "ADMIN";

  const { q, page: rawPage } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, Number(rawPage) || 1);

  const where: Prisma.PatientWhereInput = {};
  if (query) {
    where.OR = [
      { full_name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
    ];
  }
  if (!isAdmin) {
    where.visits = { some: { doctor_id: user.id } };
  }

  const [patients, patientsTotal] = await Promise.all([
    prisma.patient.findMany({
      where,
      orderBy: { id: "asc" },
      include: {
        visits: {
          where: {
            is_active: true,
            ...(isAdmin ? {} : { doctor_id: user.id }),
          },
          select: { visit_date: true, payment_amount: true },
          orderBy: { visit_date: "desc" },
        },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.patient.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(patientsTotal / PAGE_SIZE));

  const rows = patients.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    birth_date: p.birth_date,
    phone: p.phone,
    last_visit: p.visits[0]?.visit_date ?? null,
    total_payment: p.visits.reduce(
      (sum, v) => sum + Number(v.payment_amount ?? 0),
      0,
    ),
    is_active: p.is_active,
  }));

  return (
    <>
      <Topbar title="Bemorlar" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <form className="flex-1 max-w-md">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Ism yoki telefon bo'yicha qidirish..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus={!!query}
            />
          </form>
          {canCreate && <PatientActions mode="create" />}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium w-12">№</th>
                <th className="px-4 py-3 font-medium">Ism Familiya</th>
                <th className="px-4 py-3 font-medium">Tug'ilgan sana</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">Oxirgi tashrif</th>
                <th className="px-4 py-3 font-medium text-right">Jami to'lov</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    {query
                      ? "Qidiruv natijasida bemor topilmadi."
                      : "Hozircha bemorlar yo'q."}
                  </td>
                </tr>
              ) : (
                rows.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${
                      p.is_active ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/patients/${p.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {p.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(p.birth_date)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(p.last_visit)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatMoney(p.total_payment)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          p.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {p.is_active ? "Aktiv" : "Deaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PatientActions
                        mode="row"
                        patient={{
                          id: p.id,
                          full_name: p.full_name,
                          birth_date: p.birth_date
                            ? p.birth_date.toISOString().split("T")[0]
                            : "",
                          phone: p.phone ?? "",
                          is_active: p.is_active,
                        }}
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
            total={patientsTotal}
            params={{ q: query }}
            path="/patients"
          />
        </div>
      </main>
    </>
  );
}
