import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { Topbar } from "@/components/Topbar";
import { Pagination, PAGE_SIZE } from "@/components/Pagination";
import { formatDateTime } from "@/lib/utils";
import type { ActivityType } from "@prisma/client";

const TYPE_LABELS: Record<ActivityType, string> = {
  PAYMENT: "To'lov",
  VISIT: "Tashrif",
  PATIENT: "Bemor",
  DOCTOR: "Doktor",
  LOGIN: "Kirish",
};

const TYPE_STYLES: Record<ActivityType, string> = {
  PAYMENT: "bg-emerald-100 text-emerald-700",
  VISIT: "bg-blue-100 text-blue-700",
  PATIENT: "bg-violet-100 text-violet-700",
  DOCTOR: "bg-amber-100 text-amber-700",
  LOGIN: "bg-slate-200 text-slate-700",
};

const TABS: { label: string; value?: ActivityType }[] = [
  { label: "Barchasi" },
  { label: "To'lovlar", value: "PAYMENT" },
  { label: "Tashriflar", value: "VISIT" },
  { label: "Bemorlar", value: "PATIENT" },
  { label: "Doktorlar", value: "DOCTOR" },
  { label: "Kirishlar", value: "LOGIN" },
];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!hasPermission(user, "notifications:view")) {
    return (
      <>
        <Topbar title="Bildirishnomalar" />
        <main className="flex-1 p-6">
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            Bu sahifaga kirish uchun ruxsat yo&apos;q.
          </div>
        </main>
      </>
    );
  }

  const { type: rawType, page: rawPage } = await searchParams;
  const type = (
    rawType && rawType in TYPE_LABELS ? rawType : undefined
  ) as ActivityType | undefined;
  const page = Math.max(1, Number(rawPage) || 1);

  const where = type ? { type } : {};

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.activityLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Topbar title="Bildirishnomalar" />
      <main className="flex-1 p-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {TABS.map((tab) => {
            const active = tab.value === type || (!tab.value && !type);
            return (
              <Link
                key={tab.label}
                href={
                  tab.value ? `/notifications?type=${tab.value}` : "/notifications"
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium w-44">Sana</th>
                <th className="px-4 py-3 font-medium w-40">Kim bajardi</th>
                <th className="px-4 py-3 font-medium w-28">Tur</th>
                <th className="px-4 py-3 font-medium">Xabar</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-slate-400"
                  >
                    Bildirishnomalar yo'q.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 hover:bg-slate-50 align-top"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.user_name ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_STYLES[log.type]}`}
                      >
                        {TYPE_LABELS[log.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800">{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            params={{ type }}
            path="/notifications"
          />
        </div>
      </main>
    </>
  );
}
