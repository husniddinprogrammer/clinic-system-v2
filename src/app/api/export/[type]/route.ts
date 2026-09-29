import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getClinicSettings } from "@/lib/settings";
import {
  formatDate,
  formatDateTime,
  formatPaymentType,
  ACTIVITY_TYPE_LABELS,
} from "@/lib/utils";
import type { ActivityType, Prisma } from "@prisma/client";

type Row = Record<string, string | number | null>;

function forbidden() {
  return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
}

function sendXlsx(wb: XLSX.WorkBook, fileName: string) {
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
    },
  });
}

function sheetFrom(rows: Row[], headerOrder: string[], colWidths: number[]) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headerOrder });
  ws["!cols"] = colWidths.map((wch) => ({ wch }));
  return ws;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { type } = await params;
  const sp = request.nextUrl.searchParams;
  const isAdmin = user.role === "ADMIN";
  const scope = isAdmin ? {} : { doctor_id: user.id };
  const stamp = formatDate(new Date()).replaceAll(".", "-");

  const clinic = await getClinicSettings();
  const wb = XLSX.utils.book_new();
  let fileName = `${type}-${stamp}`;

  if (type === "visits") {
    if (!hasPermission(user, "visits:view")) return forbidden();

    const where: Prisma.VisitWhereInput = { ...scope };
    const from = sp.get("from");
    const to = sp.get("to");
    if (from || to) {
      where.visit_date = {};
      if (from) where.visit_date.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
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
      take: 10000,
    });

    const rows: Row[] = visits.map((v, i) => ({
      "№": i + 1,
      Sana: formatDate(v.visit_date),
      "Bemor ID": v.patient_id,
      Bemor: v.patient.full_name,
      Doctor: v.doctor.full_name,
      Tashxis: v.diagnosis ?? "",
      "Bajarilgan ishlar": v.performed_work ?? "",
      "To'lov turi": formatPaymentType(v.payment_type),
      "To'lov (so'm)": Number(v.payment_amount ?? 0),
      Status: v.is_active ? "Aktiv" : "Deaktiv",
    }));
    const total = visits.reduce(
      (s, v) => s + (v.is_active ? Number(v.payment_amount ?? 0) : 0),
      0,
    );
    rows.push({
      "№": null,
      Sana: "",
      "Bemor ID": null,
      Bemor: "",
      Doctor: "",
      Tashxis: "",
      "Bajarilgan ishlar": "",
      "To'lov turi": "JAMI:",
      "To'lov (so'm)": total,
      Status: "",
    });

    XLSX.utils.book_append_sheet(
      wb,
      sheetFrom(
        rows,
        [
          "№",
          "Sana",
          "Bemor ID",
          "Bemor",
          "Doctor",
          "Tashxis",
          "Bajarilgan ishlar",
          "To'lov turi",
          "To'lov (so'm)",
          "Status",
        ],
        [5, 12, 9, 25, 22, 30, 30, 11, 14, 9],
      ),
      "Tashriflar",
    );
    return sendXlsx(wb, fileName);
  }

  if (type === "patients") {
    if (!hasPermission(user, "patients:view")) return forbidden();

    const q = sp.get("q")?.trim() ?? "";
    const where: Prisma.PatientWhereInput = {};
    if (q) {
      where.OR = [
        { full_name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ];
    }
    if (!isAdmin) {
      where.visits = { some: { doctor_id: user.id } };
    }

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
      take: 10000,
    });

    const rows: Row[] = patients.map((p, i) => ({
      "№": i + 1,
      "F.I.Sh.": p.full_name,
      "Tug'ilgan sana": formatDate(p.birth_date),
      Telefon: p.phone ?? "",
      "Oxirgi tashrif": formatDate(p.visits[0]?.visit_date ?? null),
      "Jami to'lov (so'm)": p.visits.reduce(
        (s, v) => s + Number(v.payment_amount ?? 0),
        0,
      ),
      Status: p.is_active ? "Aktiv" : "Deaktiv",
    }));

    XLSX.utils.book_append_sheet(
      wb,
      sheetFrom(
        rows,
        [
          "№",
          "F.I.Sh.",
          "Tug'ilgan sana",
          "Telefon",
          "Oxirgi tashrif",
          "Jami to'lov (so'm)",
          "Status",
        ],
        [5, 28, 14, 15, 14, 16, 9],
      ),
      "Bemorlar",
    );
    return sendXlsx(wb, fileName);
  }

  if (type === "patient") {
    if (!hasPermission(user, "patients:view")) return forbidden();

    const id = Number(sp.get("id"));
    if (!id) return NextResponse.json({ error: "id kerak" }, { status: 400 });

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
    }
    if (!isAdmin) {
      const own = await prisma.visit.count({
        where: { patient_id: id, doctor_id: user.id },
      });
      if (own === 0) return forbidden();
    }

    const visits = await prisma.visit.findMany({
      where: { patient_id: id, ...scope },
      orderBy: { id: "desc" },
      include: { doctor: { select: { full_name: true } } },
      take: 10000,
    });

    const infoRows: Row[] = [
      { Maydon: "F.I.Sh.", Qiymat: patient.full_name },
      {
        Maydon: "Tug'ilgan sana",
        Qiymat: formatDate(patient.birth_date),
      },
      { Maydon: "Telefon", Qiymat: patient.phone ?? "" },
      { Maydon: "Status", Qiymat: patient.is_active ? "Aktiv" : "Deaktiv" },
      { Maydon: "Klinika", Qiymat: clinic.name },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      sheetFrom(infoRows, ["Maydon", "Qiymat"], [18, 40]),
      "Bemor",
    );

    const rows: Row[] = visits.map((v, i) => ({
      "№": i + 1,
      Sana: formatDate(v.visit_date),
      Doctor: v.doctor.full_name,
      Tashxis: v.diagnosis ?? "",
      "Bajarilgan ishlar": v.performed_work ?? "",
      "To'lov turi": formatPaymentType(v.payment_type),
      "To'lov (so'm)": Number(v.payment_amount ?? 0),
      "Qo'shimcha": v.additional_info ?? "",
      Status: v.is_active ? "Aktiv" : "Deaktiv",
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFrom(
        rows,
        [
          "№",
          "Sana",
          "Doctor",
          "Tashxis",
          "Bajarilgan ishlar",
          "To'lov turi",
          "To'lov (so'm)",
          "Qo'shimcha",
          "Status",
        ],
        [5, 12, 22, 30, 30, 11, 14, 25, 9],
      ),
      "Tashriflar",
    );
    fileName = `bemor-${id}-${stamp}`;
    return sendXlsx(wb, fileName);
  }

  if (type === "users") {
    if (!hasPermission(user, "users:manage")) return forbidden();

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

    const rows: Row[] = users.map((u, i) => ({
      "№": i + 1,
      Username: u.username,
      "F.I.Sh.": u.full_name,
      Role: u.role,
      Status: u.is_active ? "Aktiv" : "Deaktiv",
      Yaratilgan: formatDate(u.created_at),
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFrom(
        rows,
        ["№", "Username", "F.I.Sh.", "Role", "Status", "Yaratilgan"],
        [5, 16, 28, 10, 9, 12],
      ),
      "Userlar",
    );
    return sendXlsx(wb, fileName);
  }

  if (type === "doctors") {
    if (!hasPermission(user, "users:manage")) return forbidden();

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

    const rows: Row[] = doctors.map((d, i) => ({
      "№": i + 1,
      "F.I.Sh.": d.full_name,
      Username: d.username,
      Status: d.is_active ? "Aktiv" : "Deaktiv",
      Tashriflar: d._count.visits,
      "Jami tushum (so'm)": d.visits.reduce(
        (s, v) => s + Number(v.payment_amount ?? 0),
        0,
      ),
      Yaratilgan: formatDate(d.created_at),
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFrom(
        rows,
        [
          "№",
          "F.I.Sh.",
          "Username",
          "Status",
          "Tashriflar",
          "Jami tushum (so'm)",
          "Yaratilgan",
        ],
        [5, 28, 16, 9, 10, 18, 12],
      ),
      "Doktorlar",
    );
    return sendXlsx(wb, fileName);
  }

  if (type === "notifications") {
    if (!hasPermission(user, "notifications:view")) return forbidden();

    const rawType = sp.get("type");
    const t =
      rawType && rawType in ACTIVITY_TYPE_LABELS
        ? (rawType as ActivityType)
        : undefined;

    const logs = await prisma.activityLog.findMany({
      where: t ? { type: t } : {},
      orderBy: { id: "desc" },
      take: 5000,
    });

    const rows: Row[] = logs.map((l) => ({
      Sana: formatDateTime(l.created_at),
      "Kim bajardi": l.user_name ?? "",
      Tur: ACTIVITY_TYPE_LABELS[l.type] ?? l.type,
      Xabar: l.message,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      sheetFrom(rows, ["Sana", "Kim bajardi", "Tur", "Xabar"], [18, 22, 10, 60]),
      "Bildirishnomalar",
    );
    return sendXlsx(wb, fileName);
  }

  if (type === "reports") {
    if (!hasPermission(user, "reports:view")) return forbidden();

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
    const from = sp.get("from");
    const to = sp.get("to");
    const fromDate = from ? new Date(from) : defaultFrom;
    const toDate = to ? new Date(to) : defaultTo;
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
        take: 10000,
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

    const summary: Row[] = [
      { "Ko'rsatkich": "Klinika", Qiymat: clinic.name },
      {
        "Ko'rsatkich": "Davr",
        Qiymat: `${formatDate(fromDate)} — ${formatDate(toDate)}`,
      },
      { "Ko'rsatkich": "Tashriflar soni", Qiymat: visits.length },
      { "Ko'rsatkich": "Bemorlar soni", Qiymat: uniquePatients },
      { "Ko'rsatkich": "Umumiy tushum (so'm)", Qiymat: totalSum },
      {
        "Ko'rsatkich": "O'rtacha chek (so'm)",
        Qiymat: visits.length ? Math.round(totalSum / visits.length) : 0,
      },
    ];
    for (const p of byPaymentRows) {
      summary.push({
        "Ko'rsatkich": `${formatPaymentType(p.payment_type)} (soni / summa)`,
        Qiymat: `${p._count._all} / ${Number(p._sum.payment_amount ?? 0)}`,
      });
    }
    summary.push({
      "Ko'rsatkich": "Chop etildi",
      Qiymat: formatDateTime(new Date()),
    });
    summary.push({ "Ko'rsatkich": "Bajardi", Qiymat: user.full_name });

    XLSX.utils.book_append_sheet(
      wb,
      sheetFrom(summary, ["Ko'rsatkich", "Qiymat"], [30, 40]),
      "Xulosa",
    );

    if (isAdmin && byDoctorRows.length > 0) {
      const ids = byDoctorRows.map((r) => r.doctor_id);
      const names = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, full_name: true },
      });
      const nameMap = new Map(names.map((d) => [d.id, d.full_name]));
      const docRows: Row[] = byDoctorRows
        .map((r) => ({
          Doctor: nameMap.get(r.doctor_id) ?? `#${r.doctor_id}`,
          Tashriflar: r._count._all,
          "Tushum (so'm)": Number(r._sum.payment_amount ?? 0),
        }))
        .sort((a, b) => Number(b["Tushum (so'm)"]) - Number(a["Tushum (so'm)"]));
      XLSX.utils.book_append_sheet(
        wb,
        sheetFrom(docRows, ["Doctor", "Tashriflar", "Tushum (so'm)"], [28, 12, 16]),
        "Doctorlar",
      );
    }

    const visitRows: Row[] = visits.map((v, i) => ({
      "№": i + 1,
      Sana: formatDate(v.visit_date),
      Bemor: v.patient.full_name,
      Doctor: v.doctor.full_name,
      Tashxis: v.diagnosis ?? "",
      "To'lov turi": formatPaymentType(v.payment_type),
      "To'lov (so'm)": Number(v.payment_amount ?? 0),
    }));
    visitRows.push({
      "№": null,
      Sana: "",
      Bemor: "",
      Doctor: "",
      Tashxis: "",
      "To'lov turi": "JAMI:",
      "To'lov (so'm)": totalSum,
    });
    XLSX.utils.book_append_sheet(
      wb,
      sheetFrom(
        visitRows,
        ["№", "Sana", "Bemor", "Doctor", "Tashxis", "To'lov turi", "To'lov (so'm)"],
        [5, 12, 25, 22, 30, 11, 14],
      ),
      "Tashriflar",
    );

    fileName = `hisobot-${stamp}`;
    return sendXlsx(wb, fileName);
  }

  return NextResponse.json({ error: "Noma'lum tur" }, { status: 400 });
}
