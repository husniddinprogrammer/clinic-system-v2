import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { formatMoney } from "@/lib/utils";

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

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [totalPatients, todayVisits, todayRevenue, totalRevenue] =
    await Promise.all([
      prisma.patient.count(),
      prisma.visit.count({
        where: { visit_date: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.visit.aggregate({
        where: { visit_date: { gte: startOfDay, lte: endOfDay } },
        _sum: { payment_amount: true },
      }),
      prisma.visit.aggregate({
        _sum: { payment_amount: true },
      }),
    ]);

  const todaySum = Number(todayRevenue._sum.payment_amount ?? 0);
  const totalSum = Number(totalRevenue._sum.payment_amount ?? 0);

  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Xush kelibsiz, {user?.full_name}
          </h2>
          <p className="text-sm text-slate-500">
            {user?.role} - umumiy ko'rsatkichlar
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Jami bemorlar"
            value={String(totalPatients)}
            color="text-blue-600"
          />
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
          <StatCard
            label="Umumiy tushum"
            value={formatMoney(totalSum)}
            color="text-purple-600"
          />
        </div>
      </main>
    </>
  );
}
