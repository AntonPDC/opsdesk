# Deploying OpsDesk

Yes, you can deploy this app. Here’s what to change and where you can host it.

## Production requirements

1. **Database** — Use **PostgreSQL** in production. SQLite is fine for local dev but not on serverless (e.g. Vercel) and doesn’t scale for multi-instance deploys.
2. **Auth** — Set `NEXTAUTH_URL` to your live URL and a strong `NEXTAUTH_SECRET`.
3. **Attachments** — The app currently writes files to `public/uploads/`. On serverless (Vercel, etc.) that filesystem is ephemeral, so for production you’ll want object storage (Vercel Blob, S3, etc.) or accept that uploads don’t persist across deploys on some platforms.

---

## Option A: Vercel (recommended for Next.js)

1. **Push your code** to GitHub (or GitLab/Bitbucket).

2. **Create a Postgres database**

   - [Vercel Postgres](https://vercel.com/storage/postgres) or [Neon](https://neon.tech) (both work with Vercel).
   - Copy the connection string (e.g. `postgresql://user:pass@host/db?sslmode=require`).

3. **Switch Prisma to PostgreSQL**

   - In `prisma/schema.prisma`, change:
     - `provider = "sqlite"` → `provider = "postgresql"`
     - `url = env("DATABASE_URL")` stays the same.
   - Run locally once with the Postgres URL to apply schema:
     - `npx prisma db push` (or `prisma migrate deploy` if you use migrations).

4. **Create a Vercel project**

   - Import your repo, leave Build Command as `next build`, Output as default.
   - Add **Environment variables** (Production + Preview):
     - `DATABASE_URL` = your Postgres connection string
     - `NEXTAUTH_SECRET` = e.g. `openssl rand -base64 32`
     - `NEXTAUTH_URL` = `https://your-app.vercel.app` (use the real URL Vercel gives you)

5. **Deploy**

   - Vercel runs `next build`; Prisma client is generated in `postinstall` (`prisma generate`).
   - After first deploy, run **seed** once against production DB (from your machine or a one-off script):
     - `DATABASE_URL="your-production-url" npm run db:seed`

6. **Attachments on Vercel**
   - Writing to `public/uploads/` does not persist on serverless. For production you can:
     - Use [Vercel Blob](https://vercel.com/docs/storage/vercel-blob): add `BLOB_READ_WRITE_TOKEN` and change the attachments API to upload to Blob and store the Blob URL in `Attachment.path`, or
     - Use another object store (e.g. S3) and do the same.

---

## Deploy on Render (step-by-step)

1. **Switch Prisma to PostgreSQL** (do this in your repo before or after connecting Render)

   - In `prisma/schema.prisma`, change the datasource:
     - `provider = "sqlite"` → `provider = "postgresql"`
     - Keep `url = env("DATABASE_URL")`.
   - Commit and push.

2. **Create a PostgreSQL database on Render**

   - Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **PostgreSQL**.
   - Name it (e.g. `opsdesk-db`), choose region, create.
   - Open the DB → **Info** tab and copy **Internal Database URL** (use this for the Web Service so it stays private).

3. **Create a Web Service**

   - **New** → **Web Service**.
   - Connect your GitHub/GitLab repo and select the `opsdesk` repo.
   - Configure:
     - **Name**: e.g. `opsdesk`
     - **Region**: same as the DB.
     - **Runtime**: **Node**.
     - **Build Command**: `npm install && npx prisma generate && npm run build`
     - **Start Command**: `npm start`
     - **Instance type**: Free or paid (Free sleeps after inactivity).

4. **Environment variables** (Web Service → **Environment**)

   - `DATABASE_URL` = paste the **Internal Database URL** from the Postgres service (or **External** if you need to run migrations from your machine).
   - `NEXTAUTH_SECRET` = generate one, e.g. run `openssl rand -base64 32` locally and paste the result.
   - `NEXTAUTH_URL` = leave empty for the first deploy; after the first deploy Render will show a URL like `https://opsdesk-xxxx.onrender.com`. Then add:
     - `NEXTAUTH_URL` = `https://opsdesk-xxxx.onrender.com` (your actual URL, no trailing slash).

5. **First deploy**

   - Click **Create Web Service**. Render will install, build, and start the app.
   - After the first deploy, copy the service URL (e.g. `https://opsdesk-xxxx.onrender.com`), add `NEXTAUTH_URL` with that value, and **Save** (Render will redeploy).

6. **Create tables and seed the database (one time)**

   - From your **local machine** (with the repo and Node installed), run:
     ```bash
     export DATABASE_URL="postgresql://..."   # use the External Database URL from Render Postgres
     npx prisma db push
     npm run db:seed
     ```
   - Or use the **Internal Database URL** if your app can reach it (e.g. from a Render Shell: **Shell** tab on the Web Service and run the same commands with `DATABASE_URL` already set).

7. **Sign in**
   - Open your Render URL. Log in with:
     - **Admin**: `admin@opsdesk.local` / `demo123` (then change the password).

**Attachments:** On Render, files in `public/uploads/` are written to the instance disk. They persist until the service is redeployed or the instance is replaced. For long-term storage, add S3 (or similar) and change the attachments API later.

---

## Option B: Railway / Fly.io (Node + persistent disk)

These run a long-lived Node process and can give you a persistent filesystem, so you have more flexibility.

1. **Database**

   - Create a Postgres database on the same platform (or Neon/Supabase) and set `DATABASE_URL`.

2. **Schema**

   - In `prisma/schema.prisma`, set `provider = "postgresql"`, then:
     - `npx prisma db push` (or migrations) against that `DATABASE_URL`.

3. **Environment**

   - Set `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` (e.g. `https://your-app.railway.app`).

4. **Build & start**

   - Build: `npm run build` (or `npm ci && npm run build`).
   - Start: `npm start` (runs `next start`).

5. **Seed**
   - Run `npm run db:seed` once with production `DATABASE_URL` to create initial users.

On these platforms, `public/uploads/` can persist if the instance has a writable disk; otherwise use object storage as in Option A.

---

## Checklist before going live

- [ ] `prisma/schema.prisma`: `provider = "postgresql"` and production `DATABASE_URL` points to Postgres.
- [ ] `NEXTAUTH_URL` = exact production URL (no trailing slash).
- [ ] `NEXTAUTH_SECRET` = long random string (e.g. 32+ bytes).
- [ ] Run migrations or `prisma db push` against production DB.
- [ ] Run seed once to create admin/agent/user accounts (then change default passwords).
- [ ] (Optional) Wire `lib/email.ts` to Resend/SendGrid and set API keys.
- [ ] (Optional) Use Vercel Blob or S3 for attachments if on serverless.

---

## Quick Postgres switch (from SQLite)

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   # was "sqlite"
  url      = env("DATABASE_URL")
}
```

Then:

```bash
export DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
npx prisma db push
npm run db:seed
```

Use the same `DATABASE_URL` in your hosting provider’s environment variables.
