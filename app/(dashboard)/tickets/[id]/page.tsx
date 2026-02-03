import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TicketDetail } from "@/components/ticket-detail";

async function canAccess(
  userId: string,
  role: string,
  ticket: { requesterId: string }
) {
  if (role === "ADMIN" || role === "AGENT") return true;
  return ticket.requesterId === userId;
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

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

  if (!ticket || !(await canAccess(session.user.id, session.user.role, ticket)))
    notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <TicketDetail ticket={ticket} currentUser={session.user} />
    </div>
  );
}
