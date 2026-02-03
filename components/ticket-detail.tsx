"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { canEditSlaFields, canChangeAssignee } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth";
import type { TicketStatus } from "@/types";
import {
  MessageSquare,
  Paperclip,
  History,
  ArrowLeft,
  Clock,
  User,
} from "lucide-react";

type TicketWithRelations = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  slaDueAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requester: { id: string; name: string; email: string };
  assignee: { id: string; name: string; email: string } | null;
  comments?: Array<{
    id: string;
    body: string;
    createdAt: Date;
    user: { id: string; name: string; email: string };
  }>;
  attachments?: Array<{
    id: string;
    filename: string;
    path: string;
    size: number;
    user: { id: string; name: string };
  }>;
};

export function TicketDetail({
  ticket: initialTicket,
  currentUser,
}: {
  ticket: TicketWithRelations;
  currentUser: SessionUser;
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [tab, setTab] = useState<"comments" | "audit">("comments");
  const [comment, setComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [auditLogs, setAuditLogs] = useState<Array<{
    id: string;
    action: string;
    fieldName: string | null;
    oldValue: string | null;
    newValue: string | null;
    createdAt: Date;
    user: { name: string };
  }> | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canEditSla = canEditSlaFields(currentUser.role);
  const canAssign = canChangeAssignee(currentUser.role);

  async function loadAudit() {
    if (auditLogs !== null) return;
    setLoadingAudit(true);
    const res = await fetch(`/api/audit/${ticket.id}`);
    if (res.ok) {
      const data = await res.json();
      setAuditLogs(data);
    }
    setLoadingAudit(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    setLoadingComment(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: ticket.id, body: comment.trim() }),
    });
    setLoadingComment(false);
    if (!res.ok) return;
    const newComment = await res.json();
    setTicket((t) => ({ ...t, comments: [...(t.comments ?? []), newComment] }));
    setComment("");
  }

  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setTicket((prev) => ({ ...prev, ...updated }));
  }

  async function handleAssigneeChange(assigneeId: string | null) {
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setTicket((prev) => ({ ...prev, ...updated }));
  }

  async function handleSlaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
      ? new Date(e.target.value).toISOString()
      : null;
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slaDueAt: value }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setTicket((prev) => ({ ...prev, ...updated }));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("ticketId", ticket.id);
    formData.set("file", file);
    const res = await fetch("/api/attachments", {
      method: "POST",
      body: formData,
    });
    setUploading(false);
    e.target.value = "";
    if (!res.ok) return;
    const att = await res.json();
    setTicket((t) => ({ ...t, attachments: [...(t.attachments ?? []), att] }));
  }

  const statusOptions: TicketStatus[] = [
    "NEW",
    "IN_PROGRESS",
    "BLOCKED",
    "RESOLVED",
    "CLOSED",
  ];

  return (
    <>
      <div className="flex items-center gap-4">
        <Link
          href="/tickets"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-slate-500">
                {ticket.id}
              </span>
              <h1 className="mt-1 text-xl font-bold text-white">
                {ticket.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`badge ${
                    ticket.status === "NEW"
                      ? "bg-sky-500/20 text-sky-400"
                      : ticket.status === "IN_PROGRESS"
                      ? "bg-amber-500/20 text-amber-400"
                      : ticket.status === "BLOCKED"
                      ? "bg-red-500/20 text-red-400"
                      : ticket.status === "RESOLVED"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-600 text-slate-400"
                  }`}
                >
                  {ticket.status.replace("_", " ")}
                </span>
                <span className="badge bg-slate-700 text-slate-300">
                  {ticket.priority}
                </span>
                <span className="badge bg-slate-700 text-slate-300">
                  {ticket.category}
                </span>
              </div>
            </div>
            {(canEditSla || canAssign) && (
              <div className="flex flex-wrap gap-2">
                {canEditSla && (
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="input-base w-auto min-w-[140px]"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h2 className="text-sm font-medium text-slate-400">
                Description
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-slate-200">
                {ticket.description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <User className="h-4 w-4" />
                <span>Requester: {ticket.requester.name}</span>
              </div>
              {canAssign && (
                <AssigneeSelect
                  ticketId={ticket.id}
                  currentAssigneeId={ticket.assignee?.id ?? null}
                  value={ticket.assignee?.id ?? ""}
                  onChange={handleAssigneeChange}
                />
              )}
              {!canAssign && ticket.assignee && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <User className="h-4 w-4" />
                  <span>Assignee: {ticket.assignee.name}</span>
                </div>
              )}
              {canEditSla && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <input
                    type="datetime-local"
                    value={
                      ticket.slaDueAt
                        ? new Date(ticket.slaDueAt).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={handleSlaChange}
                    className="input-base flex-1 text-sm"
                  />
                </div>
              )}
              {!canEditSla && ticket.slaDueAt && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span>
                    SLA due: {new Date(ticket.slaDueAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-500">
            <p>Created {formatRelativeTime(ticket.createdAt)}</p>
            <p>Updated {formatRelativeTime(ticket.updatedAt)}</p>
            {ticket.resolvedAt && (
              <p>Resolved {formatRelativeTime(ticket.resolvedAt)}</p>
            )}
            {ticket.closedAt && (
              <p>Closed {formatRelativeTime(ticket.closedAt)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Comments & Audit */}
      <div className="card">
        <div className="flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => setTab("comments")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium ${
              tab === "comments"
                ? "border-b-2 border-sky-500 text-sky-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Comments ({(ticket.comments ?? []).length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("audit");
              loadAudit();
            }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium ${
              tab === "audit"
                ? "border-b-2 border-sky-500 text-sky-400"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="h-4 w-4" />
            Audit log
          </button>
        </div>

        {tab === "comments" && (
          <div className="p-5">
            <form onSubmit={handleAddComment} className="mb-6">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment…"
                rows={3}
                className="input-base mb-2"
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={loadingComment || !comment.trim()}
              >
                {loadingComment ? "Sending…" : "Add comment"}
              </button>
            </form>

            <div className="space-y-4">
              {(ticket.comments ?? []).map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-800 bg-slate-800/30 p-4"
                >
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span className="font-medium text-slate-300">
                      {c.user.name}
                    </span>
                    {formatRelativeTime(c.createdAt)}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-slate-200">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div className="p-5">
            {loadingAudit ? (
              <p className="text-slate-500">Loading…</p>
            ) : auditLogs && auditLogs.length > 0 ? (
              <ul className="space-y-3">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex flex-wrap gap-2 text-sm">
                    <span className="text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <span className="text-slate-300">{log.user.name}</span>
                    <span className="text-slate-400">{log.action}</span>
                    {log.fieldName && (
                      <span className="text-slate-500">
                        {log.fieldName}: {log.oldValue ?? "—"} →{" "}
                        {log.newValue ?? "—"}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">No audit entries.</p>
            )}
          </div>
        )}
      </div>

      {/* Attachments */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium text-white">
            <Paperclip className="h-4 w-4" />
            Attachments
          </h2>
          <label className="btn-secondary cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {uploading ? "Uploading…" : "Upload"}
          </label>
        </div>
        {(ticket.attachments ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No attachments.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(ticket.attachments ?? []).map((a) => (
              <li key={a.id}>
                <a
                  href={a.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sky-400 hover:underline"
                >
                  {a.filename}
                </a>
                <span className="ml-2 text-xs text-slate-500">
                  {a.user.name} · {(a.size / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function AssigneeSelect({
  ticketId,
  currentAssigneeId,
  value,
  onChange,
}: {
  ticketId: string;
  currentAssigneeId: string | null;
  value: string;
  onChange: (id: string | null) => void;
}) {
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    const res = await fetch("/api/users");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data);
    setLoaded(true);
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <User className="h-4 w-4 shrink-0 text-slate-400" />
      <select
        value={value}
        onFocus={load}
        onChange={(e) => onChange(e.target.value || null)}
        className="input-base flex-1"
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}
