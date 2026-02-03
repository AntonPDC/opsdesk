import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createAuditLog,
  canEditSlaFields,
  canChangeAssignee,
} from "@/lib/audit";
import { sendTicketAssigned, sendTicketStatusChanged } from "@/lib/email";
import { z } from "zod";
import type { Role } from "@/types";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  status: z
    .enum(["NEW", "IN_PROGRESS", "BLOCKED", "RESOLVED", "CLOSED"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  category: z.string().max(100).optional(),
  assigneeId: z.string().nullable().optional(),
  slaDueAt: z.string().datetime().nullable().optional(),
});

async function canAccessTicket(
  userId: string,
  role: Role,
  ticket: { requesterId: string }
) {
  if (role === "ADMIN" || role === "AGENT") return true;
  return ticket.requesterId === userId;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      comments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      attachments: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  if (!ticket)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessTicket(session.user.id, session.user.role, ticket)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(ticket);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessTicket(session.user.id, session.user.role, ticket)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(parsed.error.flatten(), { status: 400 });

  const data: Record<string, unknown> = {};
  const canEditSla = canEditSlaFields(session.user.role);
  const canAssign = canChangeAssignee(session.user.role);

  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description;
  if (parsed.data.category !== undefined) data.category = parsed.data.category;
  if (parsed.data.status !== undefined) {
    if (!canEditSla)
      return NextResponse.json(
        { error: "Cannot change status" },
        { status: 403 }
      );
    data.status = parsed.data.status;
    if (parsed.data.status === "RESOLVED") data.resolvedAt = new Date();
    if (parsed.data.status === "CLOSED") data.closedAt = new Date();
    const requester = await prisma.user.findUnique({
      where: { id: ticket.requesterId },
    });
    if (requester) {
      await sendTicketStatusChanged(
        requester.email,
        id,
        ticket.title,
        parsed.data.status
      ).catch(() => {});
    }
  }
  if (parsed.data.priority !== undefined) {
    if (!canEditSla)
      return NextResponse.json(
        { error: "Cannot change priority" },
        { status: 403 }
      );
    data.priority = parsed.data.priority;
  }
  if (parsed.data.assigneeId !== undefined) {
    if (!canAssign)
      return NextResponse.json(
        { error: "Cannot change assignee" },
        { status: 403 }
      );
    data.assigneeId = parsed.data.assigneeId;
    if (parsed.data.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: parsed.data.assigneeId },
      });
      if (assignee) {
        await sendTicketAssigned(assignee.email, id, ticket.title).catch(
          () => {}
        );
      }
    }
  }
  if (parsed.data.slaDueAt !== undefined) {
    if (!canEditSla)
      return NextResponse.json({ error: "Cannot change SLA" }, { status: 403 });
    data.slaDueAt = parsed.data.slaDueAt
      ? new Date(parsed.data.slaDueAt)
      : null;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  for (const [key, value] of Object.entries(data)) {
    const oldVal = (ticket as Record<string, unknown>)[key];
    const newVal = value;
    if (String(oldVal) !== String(newVal))
      await createAuditLog(
        id,
        session.user.id,
        "UPDATED",
        key,
        String(oldVal ?? ""),
        String(newVal ?? "")
      );
  }

  return NextResponse.json(updated);
}
