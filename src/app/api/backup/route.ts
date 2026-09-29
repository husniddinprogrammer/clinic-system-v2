import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  BACKUP_DIR,
  createBackupFile,
  restoreFromFile,
} from "@/lib/backup";
import { readdir, stat, mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

function isValidFileName(name: string): boolean {
  return (
    !!name &&
    name.endsWith(".sql") &&
    !name.includes("..") &&
    !name.includes("/") &&
    !name.includes("\\")
  );
}



export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!hasPermission(user, "backup:manage")) {
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
    const name = searchParams.get("file") ?? "";
    if (!isValidFileName(name)) {
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
  if (!hasPermission(user, "backup:manage")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  // Kompyuterdan .sql fayl yuklab restore qilish
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json(
          { error: "Fayl topilmadi." },
          { status: 400 },
        );
      }

      const origName = path
        .basename(file.name)
        .replace(/[^a-zA-Z0-9_.-]/g, "_");
      if (!origName.endsWith(".sql")) {
        return NextResponse.json(
          { error: "Faqat .sql fayl yuklash mumkin." },
          { status: 400 },
        );
      }

      await mkdir(BACKUP_DIR, { recursive: true });
      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
      const fileName = `upload_${stamp}_${origName}`;
      const filePath = path.join(BACKUP_DIR, fileName);
      await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

      await restoreFromFile(filePath);
      return NextResponse.json({ ok: true, file: fileName });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Xatolik";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const body = await request.json();
    const action = body.action;

    if (action === "backup") {
      const fileName = await createBackupFile("backup");
      return NextResponse.json({ ok: true, file: fileName });
    }

    if (action === "restore") {
      const name = String(body.file ?? "");
      if (!isValidFileName(name)) {
        return NextResponse.json({ error: "Noto'g'ri fayl" }, { status: 400 });
      }
      const filePath = path.join(BACKUP_DIR, name);
      try {
        await stat(filePath);
      } catch {
        return NextResponse.json({ error: "Fayl topilmadi" }, { status: 404 });
      }

      await restoreFromFile(filePath);
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      const name = String(body.file ?? "");
      if (!isValidFileName(name)) {
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
