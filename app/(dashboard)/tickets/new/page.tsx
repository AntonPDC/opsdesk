import { NewTicketForm } from "@/components/new-ticket-form";

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New ticket</h1>
        <p className="text-slate-400">Submit an incident or request.</p>
      </div>
      <NewTicketForm />
    </div>
  );
}
