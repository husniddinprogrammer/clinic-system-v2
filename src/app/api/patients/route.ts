import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const patients = await prisma.patient.findMany({
    where: q
      ? {
          OR: [
            { full_name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {},
    select: { id: true, full_name: true, phone: true },
    orderBy: { full_name: "asc" },
    take: 20,
  });

  return NextResponse.json({ patients });
}
