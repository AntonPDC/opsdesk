import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { sendTicketCreated } from "@/lib/email";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  category: z.string().max(100).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const assigneeId = searchParams.get("assigneeId");
  const category = searchParams.get("category");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (assigneeId) where.assigneeId = assigneeId;
  if (category) where.category = category;
  if (session.user.role === "USER") {
    where.requesterId = session.user.id;
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const ticket = await prisma.ticket.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority ?? "MEDIUM",
      category: parsed.data.category ?? "General",
      requesterId: session.user.id,
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  await createAuditLog(ticket.id, session.user.id, "CREATED");
  await sendTicketCreated(
    ticket.requester.email,
    ticket.id,
    ticket.title
  ).catch(() => {});
  return NextResponse.json(ticket);
}
