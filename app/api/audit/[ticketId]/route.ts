import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@/types";

async function canAccessTicket(userId: string, role: Role, ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return false;
  if (role === "ADMIN" || role === "AGENT") return true;
  return ticket.requesterId === userId || ticket.assigneeId === userId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId } = await params;
  if (!(await canAccessTicket(session.user.id, session.user.role, ticketId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const logs = await prisma.auditLog.findMany({
    where: { ticketId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(logs);
}
