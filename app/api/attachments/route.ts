import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { Role } from "@/types";

async function canAccessTicket(userId: string, role: Role, ticketId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return false;
  if (role === "ADMIN" || role === "AGENT") return true;
  return ticket.requesterId === userId || ticket.assigneeId === userId;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const ticketId = formData.get("ticketId") as string | null;
  const file = formData.get("file") as File | null;
  if (!ticketId || !file?.size)
    return NextResponse.json(
      { error: "Missing ticketId or file" },
      { status: 400 }
    );

  if (!(await canAccessTicket(session.user.id, session.user.role, ticketId)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dir = path.join(process.cwd(), "public", "uploads", ticketId);
  await mkdir(dir, { recursive: true });
  const ext = path.extname(file.name) || "";
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const filename = `${base}${ext}`;
  const filePath = path.join(dir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const attachment = await prisma.attachment.create({
    data: {
      ticketId,
      userId: session.user.id,
      filename: file.name,
      path: `/uploads/${ticketId}/${filename}`,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await createAuditLog(ticketId, session.user.id, "ATTACHMENT_ADDED");
  return NextResponse.json(attachment);
}
