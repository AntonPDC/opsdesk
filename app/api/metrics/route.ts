import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { differenceInHours } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "AGENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [tickets, resolved] = await Promise.all([
    prisma.ticket.findMany({
      where: { status: { not: "CLOSED" } },
      select: {
        id: true,
        status: true,
        category: true,
        createdAt: true,
        slaDueAt: true,
      },
    }),
    prisma.ticket.findMany({
      where: { resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    }),
  ]);

  const openByCategory: Record<string, number> = {};
  for (const t of tickets) {
    openByCategory[t.category] = (openByCategory[t.category] ?? 0) + 1;
  }

  let mttrHours: number | null = null;
  if (resolved.length > 0) {
    const totalHours = resolved.reduce(
      (acc, t) => acc + differenceInHours(t.resolvedAt as Date, t.createdAt),
      0
    );
    mttrHours = Math.round((totalHours / resolved.length) * 10) / 10;
  }

  return NextResponse.json({
    openByCategory: Object.entries(openByCategory).map(([category, count]) => ({
      category,
      count,
    })),
    openTotal: tickets.length,
    mttrHours,
    resolvedCount: resolved.length,
  });
}
