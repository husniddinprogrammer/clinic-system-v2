import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const SETTINGS_ID = 1;
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

// GET /api/settings?action=logo — klinika logotipi (login sahifasida ham kerak,
// shuning uchun authsiz ochiq)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("action") === "logo") {
    const settings = await prisma.clinicSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: { logo: true, logo_mime: true },
    });
    if (!settings?.logo) {
      return NextResponse.json({ error: "Logo yo'q" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(settings.logo), {
      headers: {
        "Content-Type": settings.logo_mime ?? "image/png",
        "Cache-Control": "no-cache",
      },
    });
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
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const removeLogo = formData.get("remove_logo") === "1";
    const logoFile = formData.get("logo");

    if (!name) {
      return NextResponse.json(
        { error: "Klinika nomi bo'sh bo'lmasligi kerak." },
        { status: 400 },
      );
    }

    const data: {
      name: string;
      logo?: Uint8Array<ArrayBuffer> | null;
      logo_mime?: string | null;
    } = { name };

    if (logoFile instanceof File && logoFile.size > 0) {
      if (!ALLOWED_MIME.has(logoFile.type)) {
        return NextResponse.json(
          { error: "Faqat PNG, JPG, WebP, GIF yoki SVG ruxsat etiladi." },
          { status: 400 },
        );
      }
      if (logoFile.size > MAX_LOGO_SIZE) {
        return NextResponse.json(
          { error: "Logo hajmi 2MB dan oshmasligi kerak." },
          { status: 400 },
        );
      }
      data.logo = new Uint8Array(await logoFile.arrayBuffer());
      data.logo_mime = logoFile.type;
    } else if (removeLogo) {
      data.logo = null;
      data.logo_mime = null;
    }

    await prisma.clinicSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Xatolik";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
