import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

// Parse various date formats into a Date or null
function parseExcelDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    // Could be a year only (e.g. 1990) — avval yil deb tekshiramiz
    if (Number.isInteger(value) && value >= 1900 && value <= 2100) {
      return new Date(Number(value), 0, 1);
    }
    // Excel serial number (number of days since 1899-12-30)
    if (value > 0 && value < 100000) {
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const ms = value * 24 * 60 * 60 * 1000;
      const d = new Date(epoch.getTime() + ms);
      if (!isNaN(d.getTime())) return d;
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
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
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
  return cleaned.length >= 7 ? cleaned : null;
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

// Ustun indekslari: sarlavha nomidan aniqlanadi
type ColMap = {
  name: number;
  birth: number;
  phone: number;
  diagnosis: number;
  visitDate: number;
  work: number;
  payment: number;
  additional: number;
};

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .toLowerCase()
    .replace(/[`'‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Sarlavha qatorini topib, ustunlarni mapping qiladi.
// Header topilmasa null qaytaradi (sheet bemor jadvali emas).
function detectColumns(rows: unknown[][]): { headerIdx: number; cols: ColMap } | null {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] ?? [];
    const cols: Partial<ColMap> = {};
    let nameHits = 0;

    for (let c = 0; c < row.length; c++) {
      const h = normalizeHeader(row[c]);
      if (!h) continue;

      if ((h.includes("ism") || h.includes("familiya")) && cols.name === undefined) {
        cols.name = c;
        nameHits++;
      } else if (h.includes("tug") && h.includes("yil") && cols.birth === undefined) {
        cols.birth = c;
      } else if (h.includes("telefon") && cols.phone === undefined) {
        cols.phone = c;
      } else if (h.includes("tashxis") && cols.diagnosis === undefined) {
        cols.diagnosis = c;
      } else if (h.includes("kelgan") && h.includes("sana") && cols.visitDate === undefined) {
        cols.visitDate = c;
      } else if (h.includes("bajarilgan") && cols.work === undefined) {
        cols.work = c;
      } else if (h.includes("lov") && h.includes("summa") && cols.payment === undefined) {
        cols.payment = c;
      } else if (h.includes("imcha") && cols.additional === undefined) {
        cols.additional = c;
      }
    }

    // "Bemor Ism Familiyasi" sarlavhasi bo'lgan qator — bemor jadvali
    if (nameHits > 0 && cols.name !== undefined) {
      return {
        headerIdx: i,
        cols: {
          name: cols.name,
          birth: cols.birth ?? -1,
          phone: cols.phone ?? -1,
          diagnosis: cols.diagnosis ?? -1,
          visitDate: cols.visitDate ?? -1,
          work: cols.work ?? -1,
          payment: cols.payment ?? -1,
          additional: cols.additional ?? -1,
        },
      };
    }
  }
  return null;
}

function cell(row: unknown[], idx: number): unknown {
  return idx >= 0 ? row[idx] : null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[`'‘’]/g, "'").replace(/\s+/g, " ").trim();
}

// Fayl nomiga o'xshash doctorni topish (sheet nomi = doctor ismi)
function matchDoctorBySheet(
  sheetName: string,
  doctors: { id: number; full_name: string }[],
): number | null {
  const norm = normalizeName(sheetName);
  for (const d of doctors) {
    const dn = normalizeName(d.full_name);
    if (dn && (norm.includes(dn) || dn.includes(norm))) return d.id;
  }
  return null;
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

    const doctors = await prisma.user.findMany({
      where: { role: "DOCTOR", is_active: true },
      select: { id: true, full_name: true },
    });
    let defaultDoctorId = user.id;
    if (user.role === "ADMIN" && doctors.length > 0) {
      defaultDoctorId = doctors[0].id;
    }

    let importedPatients = 0;
    let importedVisits = 0;
    let skipped = 0;
    let totalRows = 0;
    let sheetsProcessed = 0;

    // Patient dedup by name + phone
    const patientCache = new Map<string, number>();

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: null,
      });

      const detected = detectColumns(rows);
      if (!detected) continue; // bemor jadvali emas — o'tkazib yuboramiz
      sheetsProcessed++;
      const { headerIdx, cols } = detected;
      const sheetDoctorId = matchDoctorBySheet(sheetName, doctors) ?? defaultDoctorId;

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i] ?? [];
        totalRows++;
        const name = parseText(cell(row, cols.name));
        if (!name) {
          skipped++;
          continue;
        }

        const birthDate = parseExcelDate(cell(row, cols.birth));
        const phone = parsePhone(cell(row, cols.phone));
        const diagnosis = parseText(cell(row, cols.diagnosis));
        const visitDate = parseExcelDate(cell(row, cols.visitDate));
        const performedWork = parseText(cell(row, cols.work));
        const payment = parsePayment(cell(row, cols.payment));
        const additionalInfo = parseText(cell(row, cols.additional));

        // Dedup key: normalized name + phone
        const dedupKey = `${normalizeName(name)}|${phone ?? ""}`;

        let patientId = patientCache.get(dedupKey);

        if (!patientId) {
          // Check DB for existing patient (ism + telefon, yoki ism + telefon bo'sh)
          const existing = await prisma.patient.findFirst({
            where: phone
              ? {
                  OR: [
                    { full_name: name, phone },
                    { full_name: name, phone: null },
                  ],
                }
              : { full_name: name, phone: null },
            select: { id: true, phone: true, birth_date: true },
            orderBy: { id: "asc" },
          });

          if (existing) {
            patientId = existing.id;
            // Mavjud bemorning bo'sh maydonlarini to'ldirish
            if (!existing.phone && phone) {
              await prisma.patient.update({
                where: { id: patientId },
                data: { phone },
              });
            }
            if (!existing.birth_date && birthDate) {
              await prisma.patient.update({
                where: { id: patientId },
                data: { birth_date: birthDate },
              });
            }
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
          const effectiveDate = visitDate ?? new Date();
          const dayStart = new Date(effectiveDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(effectiveDate);
          dayEnd.setHours(23, 59, 59, 999);

          // Takroriy tashrif — o'tkazib yuboriladi
          const dup = await prisma.visit.findFirst({
            where: {
              patient_id: patientId,
              visit_date: { gte: dayStart, lte: dayEnd },
              payment_amount: payment ?? null,
            },
            select: { id: true },
          });
          if (dup) {
            skipped++;
            continue;
          }

          await prisma.visit.create({
            data: {
              patient_id: patientId,
              doctor_id: sheetDoctorId,
              diagnosis,
              visit_date: effectiveDate,
              performed_work: performedWork,
              payment_amount: payment,
              additional_info: additionalInfo,
            },
          });
          importedVisits++;
        }
      }
    }

    if (sheetsProcessed === 0) {
      return NextResponse.json(
        { error: "Faylda bemorlar jadvali topilmadi (sarlavha qatori kerak)." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      importedPatients,
      importedVisits,
      skipped,
      totalRows,
      sheetsProcessed,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import xatoligi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
