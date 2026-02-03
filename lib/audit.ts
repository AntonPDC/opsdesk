import { prisma } from "./db";
import type { Role } from "@/types";

export async function createAuditLog(
  ticketId: string,
  userId: string,
  action: string,
  fieldName?: string,
  oldValue?: string,
  newValue?: string
) {
  await prisma.auditLog.create({
    data: {
      ticketId,
      userId,
      action,
      fieldName: fieldName ?? null,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
    },
  });
}

export const SLA_FIELDS = [
  "slaDueAt",
  "assigneeId",
  "status",
  "priority",
] as const;

export function canEditSlaFields(role: Role): boolean {
  return role === "ADMIN" || role === "AGENT";
}

export function canChangeAssignee(role: Role): boolean {
  return role === "ADMIN" || role === "AGENT";
}

export function canManageUsers(role: Role): boolean {
  return role === "ADMIN";
}
