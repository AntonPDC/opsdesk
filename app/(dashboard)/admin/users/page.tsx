import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-400">Manage user accounts and roles.</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Name
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Email
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Role
                </th>
                <th className="px-5 py-3 text-xs font-medium uppercase text-slate-400">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-800/50">
                  <td className="px-5 py-3 font-medium text-white">{u.name}</td>
                  <td className="px-5 py-3 text-slate-300">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`badge ${
                        u.role === "ADMIN"
                          ? "bg-red-500/20 text-red-400"
                          : u.role === "AGENT"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-slate-600 text-slate-400"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
