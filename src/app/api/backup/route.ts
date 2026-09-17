import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { execFile } from "child_process";
import { promisify } from "util";
import { readdir, stat, mkdir, unlink } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

const PG_BIN = process.env.PG_BIN_PATH ?? "C:\\Program Files\\PostgreSQL\\16\\bin";
const PG_HOST = process.env.PG_HOST ?? "localhost";
const PG_PORT = process.env.PG_PORT ?? "5432";
const PG_USER = process.env.PG_USER ?? "postgres";
const PG_PASSWORD = process.env.PG_PASSWORD ?? "";
const PG_DATABASE = process.env.PG_DATABASE ?? "clinic";

const BACKUP_DIR = path.join(process.cwd(), "backup");

function getEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PGPASSWORD: PG_PASSWORD,
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "list") {
    try {
      await mkdir(BACKUP_DIR, { recursive: true });
      const files = await readdir(BACKUP_DIR);
      const sqlFiles = files.filter((f) => f.endsWith(".sql"));
      const result = [];
      for (const f of sqlFiles) {
        const filePath = path.join(BACKUP_DIR, f);
        const s = await stat(filePath);
        result.push({
          name: f,
          size: s.size,
          created: s.mtime.toISOString(),
        });
      }
      result.sort((a, b) => b.created.localeCompare(a.created));
      return NextResponse.json({ files: result });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Xatolik" },
        { status: 500 },
      );
    }
  }

  if (action === "download") {
    const name = searchParams.get("file");
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
      return NextResponse.json({ error: "Noto'g'ri fayl" }, { status: 400 });
    }
    try {
      const { readFile } = await import("fs/promises");
      const filePath = path.join(BACKUP_DIR, name);
      const data = await readFile(filePath);
      return new NextResponse(data, {
        headers: {
          "Content-Type": "application/sql",
          "Content-Disposition": `attachment; filename="${name}"`,
        },
      });
    } catch {
      return NextResponse.json({ error: "Fayl topilmadi" }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Noma'lum action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const action = body.action;

    if (action === "backup") {
      await mkdir(BACKUP_DIR, { recursive: true });
      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
      const fileName = `backup_${stamp}.sql`;
      const filePath = path.join(BACKUP_DIR, fileName);

      const pgDump = path.join(PG_BIN, "pg_dump.exe");
      await execFileAsync(
        pgDump,
        [
          "-h", PG_HOST,
          "-p", PG_PORT,
          "-U", PG_USER,
          "-d", PG_DATABASE,
          "-f", filePath,
        ],
        { env: getEnv(), maxBuffer: 50 * 1024 * 1024 },
      );

      return NextResponse.json({ ok: true, file: fileName });
    }

    if (action === "restore") {
      const name = String(body.file ?? "");
      if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
        return NextResponse.json({ error: "Noto'g'ri fayl" }, { status: 400 });
      }
      const filePath = path.join(BACKUP_DIR, name);
      try {
        await stat(filePath);
      } catch {
        return NextResponse.json({ error: "Fayl topilmadi" }, { status: 404 });
      }

      const psql = path.join(PG_BIN, "psql.exe");
      await execFileAsync(
        psql,
        [
          "-h", PG_HOST,
          "-p", PG_PORT,
          "-U", PG_USER,
          "-d", PG_DATABASE,
          "-f", filePath,
        ],
        { env: getEnv(), maxBuffer: 50 * 1024 * 1024 },
      );

      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      const name = String(body.file ?? "");
      if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
        return NextResponse.json({ error: "Noto'g'ri fayl" }, { status: 400 });
      }
      const filePath = path.join(BACKUP_DIR, name);
      try {
        await unlink(filePath);
      } catch {
        return NextResponse.json({ error: "Fayl topilmadi" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Noma'lum action" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Xatolik";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
