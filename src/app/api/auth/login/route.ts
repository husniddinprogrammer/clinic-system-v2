import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username va parol kiritilishi shart." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user || !user.is_active) {
      return NextResponse.json(
        { error: "Login yoki parol noto'g'ri." },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Login yoki parol noto'g'ri." },
        { status: 401 },
      );
    }

    await createSession({
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
    });

    return NextResponse.json({ ok: true, role: user.role });
  } catch {
    return NextResponse.json(
      { error: "Serverda xatolik yuz berdi." },
      { status: 500 },
    );
  }
}
