import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const oldPassword = String(body.old_password ?? "");
    const newPassword = String(body.new_password ?? "");

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: "Barcha maydonlar to'ldirilishi shart." },
        { status: 400 },
      );
    }
    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "Parol kamida 4 ta belgi bo'lishi shart." },
        { status: 400 },
      );
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, password_hash: true },
    });
    if (!fullUser) {
      return NextResponse.json({ error: "User topilmadi." }, { status: 404 });
    }

    const valid = await verifyPassword(oldPassword, fullUser.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Joriy parol noto'g'ri." },
        { status: 400 },
      );
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server xatoligi." }, { status: 500 });
  }
}
