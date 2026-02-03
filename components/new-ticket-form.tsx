"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewTicketForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        priority: formData.get("priority") || "MEDIUM",
        category: formData.get("category") || "General",
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.message || "Failed to create ticket.");
      return;
    }
    const ticket = await res.json();
    router.push(`/tickets/${ticket.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div>
        <label
          htmlFor="title"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          className="input-base"
          placeholder="Brief summary"
        />
      </div>
      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={5}
          className="input-base resize-y"
          placeholder="What happened or what do you need?"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="priority"
            className="mb-1 block text-sm font-medium text-slate-300"
          >
            Priority
          </label>
          <select id="priority" name="priority" className="input-base">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="category"
            className="mb-1 block text-sm font-medium text-slate-300"
          >
            Category
          </label>
          <input
            id="category"
            name="category"
            type="text"
            defaultValue="General"
            className="input-base"
            placeholder="e.g. Hardware, Access, Bug"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create ticket"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
