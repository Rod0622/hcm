# Personal financing tracker — /finance

Owner-only module for tracking the money that finances the business: who put
money in, what interest was promised, referral cuts, bank loans, and how much
of each cycle's return you actually keep. Lives in the app's sidebar under
**My finance** and is visible only to the `owner` role — admins/HR never see
it (referral cuts and margins are private).

## Where the data lives

In its own Supabase project — **Financing** (`ltmiaktqfpbbvcazcgzp`) — kept
separate from HCM tenant data. Schema:
`supabase/finance/migrations/001_finance_core.sql` (already applied).

Security model: the Financing project has no auth users. Every table has RLS
enabled with **no policies** and `anon`/`authenticated` grants revoked, so the
publishable key can read nothing. The app talks to it exclusively from the
server (route handlers + server components) using a secret key, gated by the
HCM login + owner-role check.

## Setup (one step)

1. Supabase dashboard → Financing project → Settings → API keys → copy a
   **secret** key (`sb_secret_…`).
2. Add to `.env.local`:

   ```
   FINANCE_SUPABASE_URL=https://ltmiaktqfpbbvcazcgzp.supabase.co
   FINANCE_SUPABASE_SECRET_KEY=sb_secret_...
   ```

3. Restart the dev server. `/finance` shows guided setup until the key is set.

## The model

**Investment** (one financing cycle, default 30 days):

| Field | Meaning |
|---|---|
| Transaction date | When the money came in |
| Financer | Who put the money in — includes a built-in "Me (own capital)" row |
| Principal | Amount invested |
| Interest | What the financer was promised. Enter a manual % (amount auto-computes) or type the amount directly |
| Payout date | Defaults to +30 days, editable ("or earlier") |
| Business return | What the business earns on that money over the cycle (default 10%, manual) |
| Referrer + cut | Optional; the cut is outside the financer's interest and not shown to them |
| My profit | `business return − interest − referral cut` (computed in Postgres) |

Payout due to the financer = `principal + interest`. When the cheque clears,
"Mark paid out" records the payout date; the overview lists exactly who to pay
and how much (financer payout + referral cut) as each date approaches.

When the financer is **you** (own capital), leave interest at 0 — the whole
business return is your profit.

**Bank loan**: bank, amount, manual interest (% or amount), term in months,
and repayment style — one lump sum at the end of the term or equal monthly
installments (last one absorbs rounding). The schedule is generated on save;
each installment is marked paid individually and the loan flips to fully paid
with the last one. Amount/term are locked after creation (they define the
schedule) — delete and re-record to fix a mistake.

**Reports**: pick a month (or all time) to see, per person, how much they
invested and how much they earned (interest as financer + referral cuts),
your total profit, and the full money-in/money-out ledger (capital in, loan
proceeds in, payouts/cuts/installments out). CSV export included.

Amounts are pesos; monthly grouping is by the month the money came in
(`transaction_date`). Math lives in `src/lib/finance/calc.ts`
(unit-tested in `src/lib/__tests__/finance.test.ts`).
