import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, readdir } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

const PG_BIN = process.env.PG_BIN_PATH ?? "C:\\Program Files\\PostgreSQL\\16\\bin";
const PG_HOST = process.env.PG_HOST ?? "localhost";
const PG_PORT = process.env.PG_PORT ?? "5432";
const PG_USER = process.env.PG_USER ?? "postgres";
const PG_PASSWORD = process.env.PG_PASSWORD ?? "";
const PG_DATABASE = process.env.PG_DATABASE ?? "clinic";

export const BACKUP_DIR = path.join(process.cwd(), "backup");

function getEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PGPASSWORD: PG_PASSWORD,
  };
}

function psqlArgs(extra: string[]): string[] {
  return [
    "-h", PG_HOST,
    "-p", PG_PORT,
    "-U", PG_USER,
    "-d", PG_DATABASE,
    "-v", "ON_ERROR_STOP=1",
    ...extra,
  ];
}

export async function createBackupFile(prefix: string): Promise<string> {
  await mkdir(BACKUP_DIR, { recursive: true });
  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes())}`;
  const fileName = `${prefix}_${stamp}.sql`;
  const filePath = path.join(BACKUP_DIR, fileName);
  const pgDump = path.join(PG_BIN, "pg_dump.exe");
  await execFileAsync(
    pgDump,
    ["-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", PG_DATABASE, "-f", filePath],
    { env: getEnv(), maxBuffer: 50 * 1024 * 1024 },
  );
  return fileName;
}

export async function restoreFromFile(filePath: string) {
  const psql = path.join(PG_BIN, "psql.exe");

  // Restore'dan oldin joriy holatni avtomatik backup qilish —
  // xatolik bo'lsa qaytarib olish mumkin bo'ladi
  await createBackupFile("pre_restore");

  // Jadvallar mavjud bo'lsa CREATE TABLE/COPY konflikt beradi.
  // Shu sababli public schemani tozalab, dump'ni toza bazaga qo'llaymiz.
  await execFileAsync(
    psql,
    psqlArgs([
      "-c",
      "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;",
    ]),
    { env: getEnv(), maxBuffer: 50 * 1024 * 1024 },
  );

  try {
    await execFileAsync(psql, psqlArgs(["-f", filePath]), {
      env: getEnv(),
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (e) {
    const err = e as { stderr?: string; message?: string };
    const detail = (err.stderr || err.message || "Restore xatoligi").trim();
    throw new Error(
      `Restore xatoligi: ${detail.split("\n").filter((l) => /error|xatolik/i.test(l)).slice(0, 5).join(" | ") || detail.slice(0, 400)}`,
    );
  }

  // Restore'dan keyin sequence'larni sinxronlash —
  // aks holda yangi yozuvlar "unique constraint" xatosi beradi
  await execFileAsync(
    psql,
    psqlArgs([
      "-c",
      `SELECT setval('"User_id_seq"', COALESCE((SELECT MAX(id) FROM "User"), 1));
       SELECT setval('"Patient_id_seq"', COALESCE((SELECT MAX(id) FROM "Patient"), 1));
       SELECT setval('"Visit_id_seq"', COALESCE((SELECT MAX(id) FROM "Visit"), 1));`,
    ]),
    { env: getEnv(), maxBuffer: 50 * 1024 * 1024 },
  );
}

let lastAutoBackupDate = "";

export async function ensureDailyBackup(): Promise<void> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (lastAutoBackupDate === today) return;
  lastAutoBackupDate = today;

  try {
    await mkdir(BACKUP_DIR, { recursive: true });
    const files = await readdir(BACKUP_DIR);
    const hasToday = files.some((f) => f.endsWith(".sql") && f.includes(today));
    if (!hasToday) {
      await createBackupFile("auto");
    }
  } catch (e) {
    console.error("Auto-backup xatoligi:", e);
  }
}
