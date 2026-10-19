import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { EmployeeActions } from "@/components/EmployeeActions";
import { hasPermission } from "@/lib/permissions";

export default async function EmployeesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!hasPermission(user, "employees:manage")) {
    return (
      <>
        <Topbar title="Xodimlar" />
        <main className="flex-1 p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            Bu sahifaga kirish uchun ruxsat yo&apos;q.
          </div>
        </main>
      </>
    );
  }

  const employees = await prisma.employee.findMany({
    orderBy: [{ is_active: "desc" }, { last_name: "asc" }],
  });

  return (
    <>
      <Topbar title="Xodimlar" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <p className="text-sm text-slate-500">
            Xodimlar akkauntsiz — ular faqat xarajat va texnik ishlarda
            ko&apos;rinadi.
          </p>
          <EmployeeActions mode="create" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium w-12">№</th>
                <th className="px-4 py-3 font-medium">Ism</th>
                <th className="px-4 py-3 font-medium">Familiya</th>
                <th className="px-4 py-3 font-medium">Lavozimi</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    Hozircha xodimlar yo&apos;q.
                  </td>
                </tr>
              ) : (
                employees.map((emp, i) => (
                  <tr
                    key={emp.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${
                      emp.is_active ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {emp.first_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{emp.last_name}</td>
                    <td className="px-4 py-3 text-slate-600">{emp.position}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          emp.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {emp.is_active ? "Aktiv" : "Deaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EmployeeActions
                        mode="row"
                        employee={{
                          id: emp.id,
                          first_name: emp.first_name,
                          last_name: emp.last_name,
                          position: emp.position,
                          is_active: emp.is_active,
                        }}
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
