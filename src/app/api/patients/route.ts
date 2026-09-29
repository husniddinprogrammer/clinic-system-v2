import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!hasPermission(user, "patients:view")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const patients = await prisma.patient.findMany({
    where: {
      is_active: true,
      ...(q
        ? {
            OR: [
              { full_name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    },
    select: { id: true, full_name: true, phone: true },
    orderBy: { full_name: "asc" },
    take: 20,
  });

  return NextResponse.json({ patients });
}
