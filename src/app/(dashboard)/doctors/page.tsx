import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { AddDoctorButton, DoctorToggleButton } from "@/components/DoctorActions";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function DoctorsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return (
      <>
        <Topbar title="Doktorlar" />
        <main className="flex-1 p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            Bu sahifaga kirish uchun ruxsat yo'q. Faqat ADMIN kira oladi.
          </div>
        </main>
      </>
    );
  }

  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR" },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      username: true,
      full_name: true,
      is_active: true,
      created_at: true,
      _count: { select: { visits: true } },
      visits: { select: { payment_amount: true } },
    },
  });

  return (
    <>
      <Topbar title="Doktorlar" />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            Doktorlarni qo'shish va boshqarish.
          </p>
          <AddDoctorButton />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium w-12">№</th>
                <th className="px-4 py-3 font-medium">F.I.Sh.</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Tashriflar</th>
                <th className="px-4 py-3 font-medium text-right">Jami tushum</th>
                <th className="px-4 py-3 font-medium">Yaratilgan</th>
                <th className="px-4 py-3 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {doctors.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    Doktorlar yo'q. Yangi doktor qo'shing.
                  </td>
                </tr>
              ) : (
                doctors.map((d, i) => {
                  const totalSum = d.visits.reduce(
                    (sum, v) => sum + Number(v.payment_amount ?? 0),
                    0,
                  );
                  return (
                    <tr
                      key={d.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {d.full_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{d.username}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            d.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {d.is_active ? "Aktiv" : "Deaktiv"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {d._count.visits}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {formatMoney(totalSum)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(d.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DoctorToggleButton id={d.id} isActive={d.is_active} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
