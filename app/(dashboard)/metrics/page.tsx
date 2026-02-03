import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { differenceInHours } from "date-fns";
import { BarChart3, Clock, Ticket, CheckCircle } from "lucide-react";

export default async function MetricsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "AGENT")
    redirect("/dashboard");

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
  const categoryData = Object.entries(openByCategory)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  let mttrHours: number | null = null;
  if (resolved.length > 0) {
    const totalHours = resolved.reduce(
      (acc, t) => acc + differenceInHours(t.resolvedAt as Date, t.createdAt),
      0
    );
    mttrHours = Math.round((totalHours / resolved.length) * 10) / 10;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Metrics</h1>
        <p className="text-slate-400">MTTR and open tickets by category.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-4 p-5">
          <div className="rounded-lg bg-sky-600/20 p-3">
            <Ticket className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Open tickets</p>
            <p className="text-2xl font-bold text-white">{tickets.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="rounded-lg bg-emerald-600/20 p-3">
            <CheckCircle className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">Resolved</p>
            <p className="text-2xl font-bold text-white">{resolved.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-5">
          <div className="rounded-lg bg-amber-600/20 p-3">
            <Clock className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-400">MTTR (hours)</p>
            <p className="text-2xl font-bold text-white">{mttrHours ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <BarChart3 className="h-5 w-5 text-slate-400" />
          <h2 className="font-semibold text-white">Open tickets by category</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Category
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {categoryData.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No open tickets.
                  </td>
                </tr>
              ) : (
                categoryData.map(({ category, count }) => (
                  <tr key={category} className="border-b border-slate-800/50">
                    <td className="px-5 py-3 font-medium text-white">
                      {category}
                    </td>
                    <td className="px-5 py-3 text-slate-300">{count}</td>
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
