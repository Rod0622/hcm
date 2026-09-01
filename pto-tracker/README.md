# PTO Tracker

PTO accrual tracking, requests and approvals for the PH team. Next.js 15 +
Supabase + Tailwind, deployable to Vercel, with Slack notifications for every
request and decision.

## How it works

**Accrual** — every employee earns **0.5 PTO credits per completed month**
from their hire date (6 per year). Balances are always computed live:
`accrued − approved − pending = available`. Nothing to run monthly.

**Filing leave** — three request types:

| Type | When |
| --- | --- |
| **Paid time off** | Uses credits. Blocked (with a warning) if the balance isn't enough. |
| **Leave without pay** | No credits needed; the day is unpaid. |
| **Offset** | No credits needed; the employee commits to working another day (e.g. a weekend) **inside the same bi-weekly payroll cutoff**, keeping the 80 hrs/cutoff intact. The app enforces the same-cutoff rule. |

Days are counted in working days (Mon–Fri). An optional proof file (med cert
image/PDF, ≤10MB) can be attached. Every new request and every decision posts
to your Slack channel with the details, balance, and a 7-day signed link to
the proof.

**Payroll cutoffs** — bi-weekly, anchored on the Aug 23 → Sep 5, 2026 cutoff
(payday Sep 11). The grid extends automatically in both directions; the anchor
lives in the `app_settings` table if it ever changes.

**Roles**
- **Employees** see their own balance and requests, file/cancel requests, see
  the team calendar (names and dates only — never reasons or attachments), and
  change their password. The **first account ever created becomes the admin**;
  everyone after is an employee.
- **Admins** see everything: pending approvals (with proof links), per-employee
  balances, employee editing (hire date, role, active), and announcements
  (create/edit/archive/expire/delete, with optional image or video) shown on
  everyone's home page.

**Accounts** are username + password. Internally Supabase Auth stores
`username@<NEXT_PUBLIC_AUTH_EMAIL_DOMAIN>` (not a real mailbox), which is why
email confirmation must be off and password resets go through an admin in the
Supabase dashboard (Authentication → Users → reset password).

## Setup

### 1. Database

```bash
cd pto-tracker
supabase login
supabase link --project-ref fmokenukmfrxcbcyzmyr
supabase db push          # applies supabase/migrations (schema, RLS, storage)
```

### 2. Auth settings (required)

In the Supabase dashboard → **Authentication → Sign In / Providers → Email**:
**turn OFF "Confirm email"**. Usernames have no mailbox, so confirmation mail
would never arrive and nobody could sign in.

### 3. Slack

1. Create the Slack channel, then an **Incoming Webhook** for it
   (api.slack.com/apps → your app → Incoming Webhooks → Add New Webhook).
2. Deploy the edge function and give it the webhook:

```bash
supabase secrets set SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
supabase functions deploy slack-notify
```

### 4. Run locally

```bash
cp .env.example .env.local   # values are already filled in for this project
npm install
npm run dev
```

Sign up first — **your first account becomes the admin.**

### 5. Deploy to Vercel

- Import the GitHub repo in Vercel.
- **Root Directory:** `pto-tracker` (if the app lives in a subfolder of the repo).
- Environment variables (same values as `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN`

## Architecture notes

- `supabase/migrations/` — schema, RLS and storage policies. RLS is the floor:
  employees can only read/write their own requests; the team calendar and
  directory go through `SECURITY DEFINER` functions that expose names and dates
  only. Server actions re-validate everything (Zod) before touching the DB.
- `supabase/functions/slack-notify/` — edge function invoked (with the user's
  JWT) after filing/deciding a request; it verifies the caller, then posts to
  `SLACK_WEBHOOK_URL`. Slack failures never block the request itself.
- Storage: private `proofs` bucket (per-user folders, admin-readable, signed
  URLs) and public `announcements` bucket (admin-writable).
- `src/lib/pto.ts` mirrors the SQL accrual/cutoff math — keep them in sync.
- Employees self-report their hire date at signup; HR should verify it in
  Admin → Employees, since credits accrue from that date.
