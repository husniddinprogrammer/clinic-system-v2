import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { PatientActions } from "@/components/PatientActions";
import { formatDate, formatMoney } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const canCreate = hasPermission(user.role, "patients:create");
  const canEdit = hasPermission(user.role, "patients:edit");
  const canDelete = hasPermission(user.role, "patients:delete");

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const where: Prisma.PatientWhereInput = {};
  if (query) {
    where.OR = [
      { full_name: { contains: query, mode: "insensitive" } },
      { phone: { contains: query } },
    ];
  }

  const patients = await prisma.patient.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      visits: {
        select: { visit_date: true, payment_amount: true },
        orderBy: { visit_date: "desc" },
      },
    },
    take: 500,
  });

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
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
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
        </div>
      </main>
    </>
  );
}
