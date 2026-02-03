/**
 * Email notifications. In development logs to console.
 * Wire to Resend, SendGrid, or SMTP in production via env (e.g. RESEND_API_KEY).
 */

export async function sendTicketCreated(
  to: string,
  ticketId: string,
  title: string
) {
  if (process.env.NODE_ENV === "development") {
    console.log("[Email] Ticket created:", { to, ticketId, title });
    return;
  }
  // TODO: integrate Resend/SendGrid when RESEND_API_KEY or SENDGRID_API_KEY is set
}

export async function sendTicketAssigned(
  to: string,
  ticketId: string,
  title: string
) {
  if (process.env.NODE_ENV === "development") {
    console.log("[Email] Ticket assigned:", { to, ticketId, title });
    return;
  }
}

export async function sendTicketStatusChanged(
  to: string,
  ticketId: string,
  title: string,
  newStatus: string
) {
  if (process.env.NODE_ENV === "development") {
    console.log("[Email] Ticket status changed:", {
      to,
      ticketId,
      title,
      newStatus,
    });
    return;
  }
}
