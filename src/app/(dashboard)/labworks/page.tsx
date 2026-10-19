import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { LabWorkActions } from "@/components/LabWorkActions";
import {
  formatDate,
  formatLabWorkType,
  formatMoney,
  formatPaymentType,
  toInputDate,
} from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import { Pagination, PAGE_SIZE } from "@/components/Pagination";
import type { Prisma } from "@prisma/client";

export default async function LabWorksPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!hasPermission(user, "labworks:view")) {
    return (
      <>
        <Topbar title="Texnik ishlar" />
        <main className="flex-1 p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            Bu sahifaga kirish uchun ruxsat yo&apos;q.
          </div>
        </main>
      </>
    );
  }

  const canCreate = hasPermission(user, "labworks:create");
  const canEdit = hasPermission(user, "labworks:edit");
  const canDelete = hasPermission(user, "labworks:delete");

  const { date, page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date! : "";

  const where: Prisma.LabWorkWhereInput = { is_active: true };
  if (dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    where.work_date = {
      gte: new Date(y, m - 1, d, 0, 0, 0, 0),
      lt: new Date(y, m - 1, d + 1, 0, 0, 0, 0),
    };
  }

  const [labWorks, total, employees] = await Promise.all([
    prisma.labWork.findMany({
      where,
      orderBy: [{ work_date: "desc" }, { id: "desc" }],
      include: {
        patient: { select: { id: true, full_name: true, phone: true } },
        employee: {
          select: { first_name: true, last_name: true, position: true },
        },
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.labWork.count({ where }),
    prisma.employee.findMany({
      where: { is_active: true },
      orderBy: { last_name: "asc" },
      select: { id: true, first_name: true, last_name: true, position: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Topbar title="Texnik ishlar" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={dateStr}
              className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50"
            >
              Ko&apos;rsatish
            </button>
            {dateStr && (
              <a
                href="/labworks"
                className="px-4 py-2.5 text-slate-500 text-sm hover:text-slate-700"
              >
                Barchasi
              </a>
            )}
          </form>
          {canCreate && (
            <LabWorkActions
              mode="create"
              employees={employees}
              defaultDate={toInputDate(new Date())}
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium w-12">№</th>
                <th className="px-4 py-3 font-medium">Bemor</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">Tish turi</th>
                <th className="px-4 py-3 font-medium">Texnik xodim</th>
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3 font-medium text-right">Summa</th>
                <th className="px-4 py-3 font-medium">To&apos;lov</th>
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {labWorks.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    {dateStr
                      ? "Bu kunda texnik ishlar yo'q."
                      : "Hozircha texnik ishlar yo'q."}
                  </td>
                </tr>
              ) : (
                labWorks.map((w, i) => (
                  <tr
                    key={w.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {w.patient.full_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {w.patient.phone ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                        {formatLabWorkType(w.work_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {w.employee.first_name} {w.employee.last_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(w.work_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatMoney(Number(w.price))}
                    </td>
                    <td className="px-4 py-3">
                      {w.payment_type ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          {formatPaymentType(w.payment_type)}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          To&apos;lanmadi
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <LabWorkActions
                        mode="row"
                        labWork={{
                          id: w.id,
                          patient: {
                            id: w.patient.id,
                            full_name: w.patient.full_name,
                            phone: w.patient.phone,
                          },
                          employee_id: w.employee_id,
                          work_type: w.work_type,
                          work_date: toInputDate(w.work_date),
                          price: String(Number(w.price)),
                          payment_type: w.payment_type,
                        }}
                        employees={employees}
                        defaultDate={toInputDate(new Date())}
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
            total={total}
            params={{ date: dateStr }}
            path="/labworks"
          />
        </div>
      </main>
    </>
  );
}
