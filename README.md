# OpsDesk — Incident & Change Manager

A mini ServiceNow-style web app for submitting incidents/requests, triaging, assigning, tracking status, and logging changes.

## Features

- **Auth + roles**: User / Agent / Admin (NextAuth.js + JWT)
- **Ticket lifecycle**: New → In Progress → Blocked → Resolved → Closed
- **Assignment + SLA timers**: Assign to agents, set due dates (Agent/Admin only)
- **Comments + attachments**: Threaded comments and file uploads per ticket
- **Audit log**: Who changed what, when (per ticket)
- **RBAC + field-level permissions**: Users cannot change status, assignee, or SLA fields
- **Metrics dashboard**: MTTR (mean time to resolve), open tickets by category
- **Email notifications**: Stubs for ticket created, assigned, status changed (wire to Resend/SendGrid in prod)

## Tech stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **Prisma** + **SQLite** (swap to PostgreSQL via `DATABASE_URL`)
- **NextAuth.js** (credentials provider, JWT, role in session)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL="file:./dev.db"` (or your PostgreSQL URL)
   - `NEXTAUTH_SECRET` — e.g. `openssl rand -base64 32`
   - `NEXTAUTH_URL="http://localhost:3000"`

3. **Database**

   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Sign in with:

   - **Admin**: `admin@opsdesk.local` / `demo123`
   - **Agent**: `agent@opsdesk.local` / `demo123`
   - **User**: `user@opsdesk.local` / `demo123`

## Scripts

- `npm run dev` — start dev server
- `npm run build` / `npm start` — production
- `npm run db:generate` — regenerate Prisma client
- `npm run db:push` — push schema (no migrations)
- `npm run db:seed` — seed demo users

## Project structure

- `app/` — Next.js App Router (dashboard, tickets, metrics, admin)
- `app/api/` — REST-style APIs (tickets, comments, attachments, audit, users, metrics)
- `components/` — UI (nav, ticket detail, new ticket form)
- `lib/` — db, auth, audit helpers, email stubs, utils
- `prisma/` — schema and seed

## Deployment

Yes. For production use **PostgreSQL** (not SQLite) and set `NEXTAUTH_URL` + `NEXTAUTH_SECRET` to your live URL and a secure secret. On serverless (e.g. Vercel), plan for **object storage** (Vercel Blob, S3) for attachments instead of the local `public/uploads/` folder.

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for step-by-step options (Vercel, Railway, Render, Fly.io), env vars, and Postgres switch.

## Email in production

Implement `lib/email.ts` with Resend, SendGrid, or SMTP using env vars (e.g. `RESEND_API_KEY`). The API already calls `sendTicketCreated`, `sendTicketAssigned`, and `sendTicketStatusChanged` where appropriate.
