import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Ticket, PlusCircle, Clock } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const where =
    session.user.role === "USER"
      ? {
          OR: [
            { requesterId: session.user.id },
            { assigneeId: session.user.id },
          ],
        }
      : {};

  const [myOpen, allOpen] = await Promise.all([
    prisma.ticket.count({
      where: {
        ...where,
        status: { in: ["NEW", "IN_PROGRESS", "BLOCKED"] },
        assigneeId: session.user.id,
      },
    }),
    prisma.ticket.count({
      where: { ...where, status: { in: ["NEW", "IN_PROGRESS", "BLOCKED"] } },
    }),
  ]);

  const recent = await prisma.ticket.findMany({
    where,
    take: 5,
    orderBy: { updatedAt: "desc" },
    include: {
      requester: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Overview of your tickets and activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-600/20 p-2">
              <Ticket className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Open (all)</p>
              <p className="text-2xl font-bold text-white">{allOpen}</p>
            </div>
          </div>
        </div>
        {(session.user.role === "AGENT" || session.user.role === "ADMIN") && (
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-600/20 p-2">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">
                  Assigned to me
                </p>
                <p className="text-2xl font-bold text-white">{myOpen}</p>
              </div>
            </div>
          </div>
        )}
        <Link
          href="/tickets/new"
          className="card flex items-center gap-3 p-5 transition-colors hover:border-sky-600/50 hover:bg-slate-800/50"
        >
          <div className="rounded-lg bg-slate-700 p-2">
            <PlusCircle className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">New ticket</p>
            <p className="font-medium text-sky-400">
              Create incident or request
            </p>
          </div>
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-white">Recent tickets</h2>
        </div>
        <ul className="divide-y divide-slate-800">
          {recent.length === 0 ? (
            <li className="px-5 py-8 text-center text-slate-500">
              No tickets yet.
            </li>
          ) : (
            recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-slate-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{t.title}</p>
                    <p className="truncate text-sm text-slate-500">
                      {t.requester.name}
                      {t.assignee ? ` · ${t.assignee.name}` : ""}
                    </p>
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      t.status === "NEW"
                        ? "bg-sky-500/20 text-sky-400"
                        : t.status === "IN_PROGRESS"
                        ? "bg-amber-500/20 text-amber-400"
                        : t.status === "BLOCKED"
                        ? "bg-red-500/20 text-red-400"
                        : t.status === "RESOLVED"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-600 text-slate-400"
                    }`}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
