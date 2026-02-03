"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Ticket,
  BarChart3,
  Users,
  LogOut,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/tickets/new", label: "New ticket", icon: PlusCircle },
  { href: "/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function DashboardNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  const filteredNav =
    user.role === "USER"
      ? nav.filter((item) => !["/metrics", "/admin/users"].includes(item.href))
      : user.role === "AGENT"
      ? nav.filter((item) => item.href !== "/admin/users")
      : nav;

  return (
    <aside className="flex w-56 flex-col border-r border-slate-800 bg-slate-900/50">
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <Link href="/dashboard" className="font-semibold text-white">
          OpsDesk
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/tickets" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sky-600/20 text-sky-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-2">
        <div className="rounded-lg px-3 py-2 text-xs text-slate-500">
          <span className="font-medium text-slate-400">{user.name}</span>
          <br />
          <span className="capitalize">{user.role.toLowerCase()}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-ghost mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
