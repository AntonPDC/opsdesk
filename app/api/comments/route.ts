import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";
import type { Role } from "@/types";

const createSchema = z.object({
  ticketId: z.string(),
  body: z.string().min(1).max(10000),
});

async function canAccessTicket(userId: string, role: Role, ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return false;
  if (role === "ADMIN" || role === "AGENT") return true;
  return ticket.requesterId === userId;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(parsed.error.flatten(), { status: 400 });

  if (
    !(await canAccessTicket(
      session.user.id,
      session.user.role,
      parsed.data.ticketId
    ))
  )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const comment = await prisma.comment.create({
    data: {
      ticketId: parsed.data.ticketId,
      userId: session.user.id,
      body: parsed.data.body,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await createAuditLog(parsed.data.ticketId, session.user.id, "COMMENT_ADDED");
  return NextResponse.json(comment);
}
