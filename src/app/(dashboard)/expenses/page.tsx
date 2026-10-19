import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { ExpenseActions } from "@/components/ExpenseActions";
import {
  formatDate,
  formatExpenseCategory,
  formatMoney,
  toInputDate,
} from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!hasPermission(user, "expenses:view")) {
    return (
      <>
        <Topbar title="Xarajatlar" />
        <main className="flex-1 p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            Bu sahifaga kirish uchun ruxsat yo&apos;q.
          </div>
        </main>
      </>
    );
  }

  const canCreate = hasPermission(user, "expenses:create");
  const canEdit = hasPermission(user, "expenses:edit");
  const canDelete = hasPermission(user, "expenses:delete");

  const { date } = await searchParams;
  const todayStr = toInputDate(new Date());
  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? date! : todayStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

  const [expenses, employees] = await Promise.all([
    prisma.expense.findMany({
      where: {
        is_active: true,
        date: { gte: dayStart, lt: dayEnd },
      },
      orderBy: { id: "desc" },
      include: {
        employee: {
          select: { first_name: true, last_name: true, position: true },
        },
      },
    }),
    prisma.employee.findMany({
      where: { is_active: true },
      orderBy: { last_name: "asc" },
      select: { id: true, first_name: true, last_name: true, position: true },
    }),
  ]);

  const dayTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <>
      <Topbar title="Xarajatlar" />
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
          </form>
          {canCreate && (
            <ExpenseActions
              mode="create"
              employees={employees}
              defaultDate={dateStr}
            />
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium w-12">№</th>
                <th className="px-4 py-3 font-medium">Xarajat turi</th>
                <th className="px-4 py-3 font-medium">Xodim</th>
                <th className="px-4 py-3 font-medium">Tavsif</th>
                <th className="px-4 py-3 font-medium text-right">Summa</th>
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    {formatDate(dayStart)} kuni xarajatlar yo&apos;q.
                  </td>
                </tr>
              ) : (
                expenses.map((e, i) => (
                  <tr
                    key={e.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {formatExpenseCategory(e.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {e.employee
                        ? `${e.employee.first_name} ${e.employee.last_name}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {e.description ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatMoney(Number(e.amount))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ExpenseActions
                        mode="row"
                        expense={{
                          id: e.id,
                          category: e.category,
                          amount: String(Number(e.amount)),
                          description: e.description ?? "",
                          date: toInputDate(e.date),
                          employee_id: e.employee_id,
                        }}
                        employees={employees}
                        defaultDate={dateStr}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td
                    colSpan={4}
                    className="px-4 py-3 font-semibold text-slate-700"
                  >
                    Jami ({formatDate(dayStart)})
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {formatMoney(dayTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>
    </>
  );
}
