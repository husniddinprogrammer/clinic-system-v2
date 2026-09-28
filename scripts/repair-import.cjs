// Bir martalik tuzatish skripti: 2026-09-25 da noto'g'ri ustun
// mapping bilan import qilingan qatorlarni asl Excel fayldan tiklaydi.
//
// Ishlatish:
//   node scripts/repair-import.cjs "C:/Users/admin/Desktop/Doctor S Stoma Service.xlsx"
//
// Qaysi qatorlar tuzatiladi: ismi faylda topilgan bemorlarning tashriflari.
// Moslik tekshiruvi: DBdagi performed_work (siljib tashxis tushgan) ==
// fayldagi "Bemor tashxisi" qiymati.

const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// .env yuklash (DATABASE_URL)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const prisma = new PrismaClient();

const FILE = process.argv[2];
if (!FILE) {
  console.error('Foydalanish: node scripts/repair-import.cjs "<excel fayl yo\'li>"');
  process.exit(1);
}

function normHeader(cell) {
  return String(cell ?? "")
    .toLowerCase()
    .replace(/[`'‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function detectColumns(rows) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] ?? [];
    const cols = {};
    let nameHits = 0;
    for (let c = 0; c < row.length; c++) {
      const h = normHeader(row[c]);
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

const cell = (row, idx) => (idx >= 0 ? row[idx] : null);
const txt = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  return s || null;
};
const normName = (s) => s.toLowerCase().replace(/[`'‘’]/g, "'").replace(/\s+/g, " ").trim();
const phone = (v) => {
  const s = txt(v);
  if (!s) return null;
  const c = s.replace(/[^\d+]/g, "");
  return c.length >= 7 ? c : null;
};
const pay = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return isNaN(v) ? null : v;
  const n = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
};
const date = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isInteger(v) && v >= 1900 && v <= 2100) {
    return new Date(v, 0, 1); // faqat yil kiritilgan
  }
  if (typeof v === "number" && v > 0 && v < 100000) {
    const d = new Date(new Date(Date.UTC(1899, 11, 30)).getTime() + v * 86400000);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  const dmy = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (dmy) {
    let y = parseInt(dmy[3], 10);
    if (y < 100) y += 2000;
    return new Date(y, parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

async function main() {
  const wb = XLSX.readFile(FILE);

  // 1. Barcha bemor-layout sheetlardan qatorlarni yig'ish: name -> rows
  const rowsByName = new Map();
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1, raw: true, defval: null,
    });
    const det = detectColumns(rows);
    if (!det) continue;
    for (let i = det.headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const name = txt(cell(row, det.cols.name));
      if (!name) continue;
      const key = normName(name);
      const item = {
        sheet: sheetName,
        name,
        birth: date(cell(row, det.cols.birth)),
        phone: phone(cell(row, det.cols.phone)),
        diagnosis: txt(cell(row, det.cols.diagnosis)),
        visitDate: date(cell(row, det.cols.visitDate)),
        work: txt(cell(row, det.cols.work)),
        payment: pay(cell(row, det.cols.payment)),
        additional: txt(cell(row, det.cols.additional)),
      };
      if (!rowsByName.has(key)) rowsByName.set(key, []);
      rowsByName.get(key).push(item);
    }
  }
  console.log(`Fayldan ${rowsByName.size} ta unikal ism o'qildi.`);

  // 2. Import batchini aniqlash — eng ko'p bemor yaratilgan daqiqa
  const batchRows = await prisma.$queryRaw`
    SELECT date_trunc('minute', created_at) AS m, COUNT(*)::int AS c
    FROM "Patient" GROUP BY 1 ORDER BY c DESC LIMIT 1`;
  const batchStart = batchRows[0]?.m;
  if (!batchStart) {
    console.log("Import batch topilmadi.");
    return;
  }
  const batchEnd = new Date(batchStart.getTime() + 60000);
  console.log(`Import batch: ${batchStart.toISOString()} .. ${batchEnd.toISOString()}`);
  const inBatch = { gte: batchStart, lt: batchEnd };

  // 3. "Bemor Ism Familiyasi" — sarlavha qator bemor bo'lib saqlangan, o'chirish
  const junk = await prisma.patient.findMany({
    where: { full_name: { contains: "Ism Familiyasi" }, created_at: inBatch },
  });
  for (const j of junk) {
    await prisma.patient.delete({ where: { id: j.id } }); // visits cascade
    console.log(`Sarlavha-bemor o'chirildi: #${j.id} ${j.full_name}`);
  }

  // Faqat import batch bemorlari — qo'lda kiritilganlarga tegmaymiz
  const patients = await prisma.patient.findMany({
    where: { created_at: inBatch },
    include: { visits: { orderBy: { id: "asc" } } },
  });

  let fixedPatients = 0, fixedVisits = 0, unmatched = [];

  for (const p of patients) {
    const key = normName(p.full_name);
    const rows = rowsByName.get(key);
    if (!rows || rows.length === 0) continue;

    // 3. Bemorni yangilash (telefon, tug'ilgan sana)
    const goodPhone = p.phone && p.phone.replace(/\D/g, "").length >= 7 ? p.phone : null;
    const firstRow = rows[0];
    const upd = {};
    if (!goodPhone && firstRow.phone) upd.phone = firstRow.phone;
    if (!p.birth_date && firstRow.birth) upd.birth_date = firstRow.birth;
    if (Object.keys(upd).length) {
      await prisma.patient.update({ where: { id: p.id }, data: upd });
      fixedPatients++;
    }

    // 4. Tashriflarni qatorlar bilan juftlash:
    //    DB performed_work == row.diagnosis (siljish!) bo'lsa — aniq mos
    const pool = p.visits.filter(
      (v) => v.created_at >= batchStart && v.created_at < batchEnd
    );
    for (const row of rows) {
      let vi = pool.findIndex(
        (v) => (v.performed_work ?? "") === (row.diagnosis ?? "")
      );
      if (vi === -1) {
        vi = 0; // oxirgi chora: ketma-ketlik bo'yicha
        if (pool[0]) unmatched.push(`ishonchsiz: visit#${pool[0].id} (${p.full_name}) <- "${row.diagnosis}"`);
      }
      const v = pool[vi];
      if (!v) break;
      pool.splice(vi, 1);

      await prisma.visit.update({
        where: { id: v.id },
        data: {
          visit_date: row.visitDate ?? v.visit_date,
          diagnosis: row.diagnosis,
          performed_work: row.work,
          payment_amount: row.payment,
          additional_info: row.additional,
        },
      });
      fixedVisits++;
    }
    if (pool.length) unmatched.push(...pool.map((v) => `qolgan: visit#${v.id} (${p.full_name})`));
  }

  // 5. Bir xil ismli dublikat bemorlarni birlashtirish (kichik id qoladi)
  const all = await prisma.patient.findMany({ orderBy: { id: "asc" }, select: { id: true, full_name: true, phone: true } });
  const byName = new Map();
  for (const p of all) {
    const k = normName(p.full_name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(p);
  }
  for (const [k, group] of byName) {
    if (group.length < 2) continue;
    const keep = group[0];
    for (const dupe of group.slice(1)) {
      await prisma.visit.updateMany({ where: { patient_id: dupe.id }, data: { patient_id: keep.id } });
      await prisma.patient.delete({ where: { id: dupe.id } });
      console.log(`Dublikat birlashtirildi: #${dupe.id} -> #${keep.id} (${keep.full_name})`);
    }
  }

  console.log(`Bemorlar yangilandi: ${fixedPatients}`);
  console.log(`Tashriflar tuzatildi: ${fixedVisits}`);
  if (unmatched.length) {
    console.log("Diqqat talab qiladiganlar:");
    for (const u of unmatched) console.log("  " + u);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
