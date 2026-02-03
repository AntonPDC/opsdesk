import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRelativeTime } from "@/lib/utils";

export default async function TicketsPage() {
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

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      requester: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tickets</h1>
          <p className="text-slate-400">All incidents and requests.</p>
        </div>
        <Link href="/tickets/new" className="btn-primary">
          New ticket
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  ID / Title
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Priority
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Requester
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Assignee
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No tickets yet.{" "}
                    <Link
                      href="/tickets/new"
                      className="text-sky-400 hover:underline"
                    >
                      Create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30"
                  >
                    <td className="px-5 py-3">
                      <Link href={`/tickets/${t.id}`} className="block">
                        <span className="font-mono text-xs text-slate-500">
                          {t.id.slice(0, 8)}
                        </span>
                        <span className="mt-0.5 block font-medium text-white hover:text-sky-400">
                          {t.title}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`badge ${
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
                    </td>
                    <td className="px-5 py-3 text-slate-300">{t.priority}</td>
                    <td className="px-5 py-3 text-slate-300">
                      {t.requester.name}
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {t.assignee?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">
                      {formatRelativeTime(t.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
