import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// Parse various date formats into a Date or null
function parseExcelDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  // Excel serial number (number of days since 1899-12-30)
  if (typeof value === "number") {
    if (value > 0 && value < 100000) {
      // Excel serial date
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const ms = value * 24 * 60 * 60 * 1000;
      const d = new Date(epoch.getTime() + ms);
      if (!isNaN(d.getTime())) return d;
    }
    // Could be a year only (e.g. 1990)
    if (Number.isInteger(value) && value >= 1900 && value <= 2100) {
      return new Date(Number(value), 0, 1);
    }
    return null;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Year only (e.g. "1990")
  if (/^\d{4}$/.test(str)) {
    const y = parseInt(str, 10);
    if (y >= 1900 && y <= 2100) return new Date(y, 0, 1);
  }

  // dd.mm.yyyy
  const dmy = str.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (dmy) {
    let day = parseInt(dmy[1], 10);
    let month = parseInt(dmy[2], 10) - 1;
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // yyyy-mm-dd
  const ymd = str.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
  if (ymd) {
    const d = new Date(
      parseInt(ymd[1], 10),
      parseInt(ymd[2], 10) - 1,
      parseInt(ymd[3], 10),
    );
    if (!isNaN(d.getTime())) return d;
  }

  // Try Date.parse as fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}

// Parse phone number - keep digits and + sign
function parsePhone(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim();
  if (!str) return null;
  const cleaned = str.replace(/[^\d+]/g, "");
  return cleaned || null;
}

// Parse payment amount from various formats
function parsePayment(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }
  const str = String(value).trim();
  if (!str) return null;
  // Remove everything except digits, dot, comma, minus
  let cleaned = str.replace(/[^\d.,-]/g, "");
  // If both . and , present, assume , is thousands separator
  if (cleaned.includes(".") && cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(",", ".");
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim();
  return str || null;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasPermission(user.role, "patients:create")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Fayl topilmadi." },
        { status: 400 },
      );
    }

    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array", cellDates: false });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    if (rows.length < 2) {
      return NextResponse.json(
        { error: "Faylda ma'lumot topilmadi." },
        { status: 400 },
      );
    }

    // Detect header row (skip if first cell looks like header)
    let startIdx = 0;
    const firstRow = rows[0] ?? [];
    const firstCell = String(firstRow[0] ?? "").toLowerCase();
    if (
      firstCell.includes("№") ||
      firstCell.includes("n") ||
      firstCell.includes("ism")
    ) {
      startIdx = 1;
    }

    // Get doctors for assignment (default to current user if doctor)
    const doctors = await prisma.user.findMany({
      where: { role: "DOCTOR", is_active: true },
      select: { id: true },
    });
    let defaultDoctorId = user.id;
    if (user.role !== "DOCTOR" && user.role !== "ADMIN") {
      defaultDoctorId = doctors[0]?.id ?? user.id;
    }
    if (user.role === "ADMIN" && doctors.length > 0) {
      defaultDoctorId = doctors[0].id;
    }

    let importedPatients = 0;
    let importedVisits = 0;
    let skipped = 0;

    // Patient dedup by name + phone
    const patientCache = new Map<string, number>();

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i] ?? [];
      // Columns: №, name, birth year, phone, diagnosis, visit date, performed work, payment, complications (ignored), additional
      const name = parseText(row[1]);
      if (!name) {
        skipped++;
        continue;
      }

      const birthDate = parseExcelDate(row[2]);
      const phone = parsePhone(row[3]);
      const diagnosis = parseText(row[4]);
      const visitDate = parseExcelDate(row[5]);
      const performedWork = parseText(row[6]);
      const payment = parsePayment(row[7]);
      const additionalInfo = parseText(row[9]);

      // Dedup key: normalized name + phone
      const dedupKey = `${name.toLowerCase().trim()}|${phone ?? ""}`;

      let patientId = patientCache.get(dedupKey);

      if (!patientId) {
        // Check DB for existing patient
        const existing = await prisma.patient.findFirst({
          where: phone
            ? { full_name: name, phone }
            : { full_name: name, phone: null },
          select: { id: true },
        });

        if (existing) {
          patientId = existing.id;
        } else {
          const created = await prisma.patient.create({
            data: {
              full_name: name,
              birth_date: birthDate,
              phone,
            },
          });
          patientId = created.id;
          importedPatients++;
        }
        patientCache.set(dedupKey, patientId);
      }

      // Create visit if any visit-related field has data
      const hasVisitData =
        diagnosis || visitDate || performedWork || payment || additionalInfo;

      if (hasVisitData) {
        await prisma.visit.create({
          data: {
            patient_id: patientId,
            doctor_id: defaultDoctorId,
            diagnosis,
            visit_date: visitDate ?? new Date(),
            performed_work: performedWork,
            payment_amount: payment,
            additional_info: additionalInfo,
          },
        });
        importedVisits++;
      }
    }

    return NextResponse.json({
      ok: true,
      importedPatients,
      importedVisits,
      skipped,
      totalRows: rows.length - startIdx,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import xatoligi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
