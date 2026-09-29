import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getClinicSettings } from "@/lib/settings";
import { PrintDoc, PrintTable, PrintTd } from "@/components/PrintDoc";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPaymentType,
  calcAge,
  ACTIVITY_TYPE_LABELS,
} from "@/lib/utils";
import type { ActivityType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function Denied() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-slate-500">
        Bu hujjatga kirish uchun ruxsat yo&apos;q.
      </p>
    </div>
  );
}

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { type } = await params;
  const sp = await searchParams;
  const clinic = await getClinicSettings();
  const logoUrl = clinic.hasLogo
    ? `/api/settings?action=logo&v=${clinic.updatedAt.getTime()}`
    : null;

  const isAdmin = user.role === "ADMIN";
  const scope = isAdmin ? {} : { doctor_id: user.id };
  const common = { clinicName: clinic.name, logoUrl, userName: user.full_name };

  /* ------------------------------ TASHRIFLAR ------------------------------ */
  if (type === "visits") {
    if (!hasPermission(user, "visits:view")) return <Denied />;

    const where: Prisma.VisitWhereInput = { ...scope };
    if (sp.from || sp.to) {
      where.visit_date = {};
      if (sp.from) where.visit_date.gte = new Date(sp.from);
      if (sp.to) {
        const toDate = new Date(sp.to);
        toDate.setHours(23, 59, 59, 999);
        where.visit_date.lte = toDate;
      }
    }

    const visits = await prisma.visit.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        patient: { select: { full_name: true } },
        doctor: { select: { full_name: true } },
      },
      take: 5000,
    });
    const total = visits.reduce(
      (s, v) => s + (v.is_active ? Number(v.payment_amount ?? 0) : 0),
      0,
    );

    return (
      <PrintDoc
        {...common}
        title="Tashriflar ro'yxati"
        subtitle={
          sp.from || sp.to
            ? `Davr: ${sp.from ?? "…"} — ${sp.to ?? "…"}`
            : undefined
        }
      >
        <PrintTable
          columns={[
            "№",
            "Sana",
            "Bemor",
            "Doctor",
            "Tashxis",
            "To'lov turi",
            "To'lov",
            "Status",
          ]}
        >
          {visits.map((v, i) => (
            <tr key={v.id}>
              <PrintTd>{i + 1}</PrintTd>
              <PrintTd>{formatDate(v.visit_date)}</PrintTd>
              <PrintTd>{v.patient.full_name}</PrintTd>
              <PrintTd>{v.doctor.full_name}</PrintTd>
              <PrintTd>{v.diagnosis ?? "-"}</PrintTd>
              <PrintTd>{formatPaymentType(v.payment_type)}</PrintTd>
              <PrintTd right>{formatMoney(Number(v.payment_amount ?? 0))}</PrintTd>
              <PrintTd>{v.is_active ? "Aktiv" : "Deaktiv"}</PrintTd>
            </tr>
          ))}
          <tr>
            <td
              colSpan={6}
              className="border border-slate-300 px-2 py-1.5 text-right font-bold"
            >
              JAMI:
            </td>
            <PrintTd right bold>
              {formatMoney(total)}
            </PrintTd>
            <PrintTd>{""}</PrintTd>
          </tr>
        </PrintTable>
      </PrintDoc>
    );
  }

  /* ------------------------------- BEMORLAR ------------------------------- */
  if (type === "patients") {
    if (!hasPermission(user, "patients:view")) return <Denied />;

    const q = sp.q?.trim() ?? "";
    const where: Prisma.PatientWhereInput = {};
    if (q) {
      where.OR = [
        { full_name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ];
    }
    if (!isAdmin) where.visits = { some: { doctor_id: user.id } };

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        visits: {
          where: { is_active: true, ...scope },
          select: { visit_date: true, payment_amount: true },
          orderBy: { visit_date: "desc" },
        },
      },
      take: 5000,
    });

    return (
      <PrintDoc
        {...common}
        title="Bemorlar ro'yxati"
        subtitle={q ? `Qidiruv: "${q}"` : undefined}
      >
        <PrintTable
          columns={[
            "№",
            "F.I.Sh.",
            "Tug'ilgan sana",
            "Telefon",
            "Oxirgi tashrif",
            "Jami to'lov",
            "Status",
          ]}
        >
          {patients.map((p, i) => (
            <tr key={p.id}>
              <PrintTd>{i + 1}</PrintTd>
              <PrintTd>{p.full_name}</PrintTd>
              <PrintTd>{formatDate(p.birth_date)}</PrintTd>
              <PrintTd>{p.phone ?? "-"}</PrintTd>
              <PrintTd>{formatDate(p.visits[0]?.visit_date ?? null)}</PrintTd>
              <PrintTd right>
                {formatMoney(
                  p.visits.reduce(
                    (s, v) => s + Number(v.payment_amount ?? 0),
                    0,
                  ),
                )}
              </PrintTd>
              <PrintTd>{p.is_active ? "Aktiv" : "Deaktiv"}</PrintTd>
            </tr>
          ))}
        </PrintTable>
      </PrintDoc>
    );
  }

  /* --------------------------- BEMOR KARTOCHASI --------------------------- */
  if (type === "patient") {
    if (!hasPermission(user, "patients:view")) return <Denied />;

    const id = Number(sp.id);
    if (!id) notFound();

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) notFound();
    if (!isAdmin) {
      const own = await prisma.visit.count({
        where: { patient_id: id, doctor_id: user.id },
      });
      if (own === 0) return <Denied />;
    }

    const visits = await prisma.visit.findMany({
      where: { patient_id: id, ...scope },
      orderBy: { id: "desc" },
      include: { doctor: { select: { full_name: true } } },
      take: 5000,
    });
    const total = visits.reduce(
      (s, v) => s + (v.is_active ? Number(v.payment_amount ?? 0) : 0),
      0,
    );

    return (
      <PrintDoc {...common} title="Bemor kartochkasi">
        <div className="mb-4 text-sm border border-slate-300 rounded p-3 grid grid-cols-2 gap-x-6 gap-y-1">
          <div>
            <span className="text-slate-500">F.I.Sh.: </span>
            <strong>{patient.full_name}</strong>
          </div>
          <div>
            <span className="text-slate-500">Telefon: </span>
            {patient.phone ?? "-"}
          </div>
          <div>
            <span className="text-slate-500">Tug&apos;ilgan sana: </span>
            {formatDate(patient.birth_date)}
            {patient.birth_date && ` (${calcAge(patient.birth_date)} yosh)`}
          </div>
          <div>
            <span className="text-slate-500">Status: </span>
            {patient.is_active ? "Aktiv" : "Deaktiv"}
          </div>
        </div>
        <PrintTable
          columns={[
            "№",
            "Sana",
            "Doctor",
            "Tashxis",
            "Bajarilgan ishlar",
            "To'lov turi",
            "To'lov",
          ]}
        >
          {visits.map((v, i) => (
            <tr key={v.id}>
              <PrintTd>{i + 1}</PrintTd>
              <PrintTd>{formatDate(v.visit_date)}</PrintTd>
              <PrintTd>{v.doctor.full_name}</PrintTd>
              <PrintTd>{v.diagnosis ?? "-"}</PrintTd>
              <PrintTd>{v.performed_work ?? "-"}</PrintTd>
              <PrintTd>{formatPaymentType(v.payment_type)}</PrintTd>
              <PrintTd right>{formatMoney(Number(v.payment_amount ?? 0))}</PrintTd>
            </tr>
          ))}
          <tr>
            <td
              colSpan={6}
              className="border border-slate-300 px-2 py-1.5 text-right font-bold"
            >
              JAMI:
            </td>
            <PrintTd right bold>
              {formatMoney(total)}
            </PrintTd>
          </tr>
        </PrintTable>
      </PrintDoc>
    );
  }

  /* -------------------------------- USERLAR ------------------------------- */
  if (type === "users") {
    if (!hasPermission(user, "users:manage")) return <Denied />;

    const users = await prisma.user.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        username: true,
        full_name: true,
        role: true,
        is_active: true,
        created_at: true,
      },
      take: 5000,
    });

    return (
      <PrintDoc {...common} title="Foydalanuvchilar ro'yxati">
        <PrintTable
          columns={["№", "Username", "F.I.Sh.", "Role", "Status", "Yaratilgan"]}
        >
          {users.map((u, i) => (
            <tr key={u.id}>
              <PrintTd>{i + 1}</PrintTd>
              <PrintTd>{u.username}</PrintTd>
              <PrintTd>{u.full_name}</PrintTd>
              <PrintTd>{u.role}</PrintTd>
              <PrintTd>{u.is_active ? "Aktiv" : "Deaktiv"}</PrintTd>
              <PrintTd>{formatDate(u.created_at)}</PrintTd>
            </tr>
          ))}
        </PrintTable>
      </PrintDoc>
    );
  }

  /* ------------------------------- DOKTORLAR ------------------------------ */
  if (type === "doctors") {
    if (!hasPermission(user, "users:manage")) return <Denied />;

    const doctors = await prisma.user.findMany({
      where: { role: "DOCTOR" },
      orderBy: { id: "desc" },
      select: {
        id: true,
        username: true,
        full_name: true,
        is_active: true,
        created_at: true,
        _count: { select: { visits: { where: { is_active: true } } } },
        visits: {
          where: { is_active: true },
          select: { payment_amount: true },
        },
      },
      take: 5000,
    });

    return (
      <PrintDoc {...common} title="Doktorlar ro'yxati">
        <PrintTable
          columns={[
            "№",
            "F.I.Sh.",
            "Username",
            "Status",
            "Tashriflar",
            "Jami tushum",
            "Yaratilgan",
          ]}
        >
          {doctors.map((d, i) => (
            <tr key={d.id}>
              <PrintTd>{i + 1}</PrintTd>
              <PrintTd>{d.full_name}</PrintTd>
              <PrintTd>{d.username}</PrintTd>
              <PrintTd>{d.is_active ? "Aktiv" : "Deaktiv"}</PrintTd>
              <PrintTd right>{d._count.visits}</PrintTd>
              <PrintTd right>
                {formatMoney(
                  d.visits.reduce(
                    (s, v) => s + Number(v.payment_amount ?? 0),
                    0,
                  ),
                )}
              </PrintTd>
              <PrintTd>{formatDate(d.created_at)}</PrintTd>
            </tr>
          ))}
        </PrintTable>
      </PrintDoc>
    );
  }

  /* --------------------------- BILDIRISHNOMALAR --------------------------- */
  if (type === "notifications") {
    if (!hasPermission(user, "notifications:view")) return <Denied />;

    const t =
      sp.type && sp.type in ACTIVITY_TYPE_LABELS
        ? (sp.type as ActivityType)
        : undefined;

    const logs = await prisma.activityLog.findMany({
      where: t ? { type: t } : {},
      orderBy: { id: "desc" },
      take: 1000,
    });

    return (
      <PrintDoc
        {...common}
        title="Bildirishnomalar"
        subtitle={t ? `Tur: ${ACTIVITY_TYPE_LABELS[t]}` : undefined}
      >
        <PrintTable columns={["Sana", "Kim bajardi", "Tur", "Xabar"]}>
          {logs.map((l) => (
            <tr key={l.id}>
              <PrintTd>{formatDateTime(l.created_at)}</PrintTd>
              <PrintTd>{l.user_name ?? "-"}</PrintTd>
              <PrintTd>{ACTIVITY_TYPE_LABELS[l.type] ?? l.type}</PrintTd>
              <PrintTd>{l.message}</PrintTd>
            </tr>
          ))}
        </PrintTable>
      </PrintDoc>
    );
  }

  /* -------------------------------- HISOBOT ------------------------------- */
  if (type === "reports") {
    if (!hasPermission(user, "reports:view")) return <Denied />;

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultTo = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    const fromDate = sp.from ? new Date(sp.from) : defaultFrom;
    const toDate = sp.to ? new Date(sp.to) : defaultTo;
    toDate.setHours(23, 59, 59, 999);

    const where: Prisma.VisitWhereInput = {
      visit_date: { gte: fromDate, lte: toDate },
      is_active: true,
      ...scope,
    };

    const [visits, byDoctorRows, byPaymentRows] = await Promise.all([
      prisma.visit.findMany({
        where,
        orderBy: { id: "desc" },
        include: {
          patient: { select: { full_name: true } },
          doctor: { select: { full_name: true } },
        },
        take: 5000,
      }),
      isAdmin
        ? prisma.visit.groupBy({
            by: ["doctor_id"],
            where,
            _count: { _all: true },
            _sum: { payment_amount: true },
          })
        : [],
      prisma.visit.groupBy({
        by: ["payment_type"],
        where,
        _count: { _all: true },
        _sum: { payment_amount: true },
      }),
    ]);

    const totalSum = visits.reduce(
      (s, v) => s + Number(v.payment_amount ?? 0),
      0,
    );
    const uniquePatients = new Set(visits.map((v) => v.patient_id)).size;

    const doctorIds = byDoctorRows.map((r) => r.doctor_id);
    const doctorNames = doctorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: doctorIds } },
          select: { id: true, full_name: true },
        })
      : [];
    const nameMap = new Map(doctorNames.map((d) => [d.id, d.full_name]));

    return (
      <PrintDoc
        {...common}
        title="Moliyaviy hisobot"
        subtitle={`Davr: ${formatDate(fromDate)} — ${formatDate(toDate)}`}
      >
        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
          <div className="border border-slate-300 rounded p-3">
            <div className="text-slate-500 text-xs uppercase">Tashriflar</div>
            <div className="text-xl font-bold">{visits.length}</div>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <div className="text-slate-500 text-xs uppercase">Bemorlar</div>
            <div className="text-xl font-bold">{uniquePatients}</div>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <div className="text-slate-500 text-xs uppercase">
              Umumiy tushum
            </div>
            <div className="text-xl font-bold">{formatMoney(totalSum)}</div>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <div className="text-slate-500 text-xs uppercase">
              O&apos;rtacha chek
            </div>
            <div className="text-xl font-bold">
              {formatMoney(visits.length ? totalSum / visits.length : 0)}
            </div>
          </div>
        </div>

        {byPaymentRows.length > 0 && (
          <>
            <h3 className="text-sm font-bold mb-1.5">
              To&apos;lov turlari bo&apos;yicha
            </h3>
            <PrintTable columns={["To'lov turi", "Soni", "Summa"]}>
              {byPaymentRows.map((p) => (
                <tr key={p.payment_type ?? "none"}>
                  <PrintTd>{formatPaymentType(p.payment_type)}</PrintTd>
                  <PrintTd right>{p._count._all}</PrintTd>
                  <PrintTd right>
                    {formatMoney(Number(p._sum.payment_amount ?? 0))}
                  </PrintTd>
                </tr>
              ))}
            </PrintTable>
            <div className="mb-5" />
          </>
        )}

        {isAdmin && byDoctorRows.length > 0 && (
          <>
            <h3 className="text-sm font-bold mb-1.5">
              Doktorlar bo&apos;yicha
            </h3>
            <PrintTable columns={["Doctor", "Tashriflar", "Tushum"]}>
              {byDoctorRows
                .slice()
                .sort(
                  (a, b) =>
                    Number(b._sum.payment_amount ?? 0) -
                    Number(a._sum.payment_amount ?? 0),
                )
                .map((r) => (
                  <tr key={r.doctor_id}>
                    <PrintTd>
                      {nameMap.get(r.doctor_id) ?? `#${r.doctor_id}`}
                    </PrintTd>
                    <PrintTd right>{r._count._all}</PrintTd>
                    <PrintTd right>
                      {formatMoney(Number(r._sum.payment_amount ?? 0))}
                    </PrintTd>
                  </tr>
                ))}
            </PrintTable>
            <div className="mb-5" />
          </>
        )}

        <h3 className="text-sm font-bold mb-1.5">Tashriflar ro&apos;yxati</h3>
        <PrintTable
          columns={[
            "№",
            "Sana",
            "Bemor",
            "Doctor",
            "Tashxis",
            "To'lov turi",
            "To'lov",
          ]}
        >
          {visits.map((v, i) => (
            <tr key={v.id}>
              <PrintTd>{i + 1}</PrintTd>
              <PrintTd>{formatDate(v.visit_date)}</PrintTd>
              <PrintTd>{v.patient.full_name}</PrintTd>
              <PrintTd>{v.doctor.full_name}</PrintTd>
              <PrintTd>{v.diagnosis ?? "-"}</PrintTd>
              <PrintTd>{formatPaymentType(v.payment_type)}</PrintTd>
              <PrintTd right>{formatMoney(Number(v.payment_amount ?? 0))}</PrintTd>
            </tr>
          ))}
          <tr>
            <td
              colSpan={6}
              className="border border-slate-300 px-2 py-1.5 text-right font-bold"
            >
              JAMI:
            </td>
            <PrintTd right bold>
              {formatMoney(totalSum)}
            </PrintTd>
          </tr>
        </PrintTable>
      </PrintDoc>
    );
  }

  notFound();
}
