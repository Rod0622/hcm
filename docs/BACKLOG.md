# Tenkara HCM — Backlog

Status of every product surface and the sequenced plan for what's next.
Updated as modules ship; the empty states in the app point here.

Demo logins (password `TenkaraDemo2026!`):
- `rod@trytenkara.com` — owner (PH employee "Rod Mercado", reports to Ana)
- `ana@trytenkara.com` — admin (Head of People persona)
- `mia@trytenkara.com` — member (employee-level access only)

## Shipped (live data, RLS-enforced)

| Surface | Notes |
|---|---|
| Auth + roles | Email/password login; admin vs employee tiers enforced in Postgres RLS, not just UI |
| Employees directory + profile | Live workers/people; admin edit (name, phone, role, level, location, salary→comp history); profile photos |
| Org chart | Reporting tree with focus-on-manager, department view, search |
| Recruiting | Openings with weighted keywords, ATS resume scanner (PDF/DOCX), ranked applicants, resume storage |
| Offers | Custom offer → email; signed-offer upload → hired; candidate history; rejection batches gated by admin approval |
| Access provisioning | SSO-flagged software catalog, per-hire grants (real IdP integration pending) |
| Time & leave | PH PTO accrual (0.5 day/mo) computed from service months; leave requests → manager notification → approve/reject |
| Time clock | Clock in/out + breaks on Home and /time; admin attendance (time in/out, worked, breaks, live status) |
| Time Doctor | Sync scaffold ready (`TIMEDOCTOR_API_TOKEN` + `TIMEDOCTOR_COMPANY_ID` to enable) |
| Payroll (employee) | "My payroll" payslip history from the live run lines |
| Inbox | Real notifications (leave, rejection approvals) with unread state |
| Dashboard | Live stats, headcount chart, approvals with working Approve, workflow runs, onboarding pipeline |
| Configuration studio | Live custom fields (add/archive), leave policies CRUD, payroll rule sets, role management, integration status, REST info, audit log viewer + CSV export |
| Payroll (admin) | Calculation engine: PH statutory (SSS/PhilHealth/Pag-IBIG/BIR TRAIN), US/SG estimates, OT 1.25x from time clock, unpaid-leave deduction; draft→review→approve→process with exceptions |
| Convert to employee | Hired candidate → worker with comp from the signed offer, one dialog |
| Performance | Goals with progress, manager reviews per cycle (draft/submit/share), admin-managed cycles |
| Requests | Self-service COE/payslip requests, HR fulfillment via private hr-docs bucket, notifications both ways |
| Holidays & calendar | PH/US/SG 2026 holidays; leave counts skip them; team month calendar on /time |
| Maintenance cron | Nightly: document-expiry alerts, auto-close forgotten time entries |
| Tests | vitest suite: ATS scoring, leave math, payroll engine, 13th-month (25 tests) |
| Login provisioning | Admin-gated RPC creates logins (convert-to-employee option + profile button); temp password shown once |
| Offboarding | Last day + reason → cancels pending leave, revokes access grants, notifies HR with final-pay estimate; nightly flip to terminated |
| Payroll verification | Per-line payslip breakdown dialog, register + components CSV, docs/PAYROLL.md formula spec for accountant validation |
| Analytics | Live headcount trend, dept/country mix, attendance hours, leave usage, payroll runs, recruiting funnel |
| Compliance | Live packs (done/total, next due), open-task list, audit feed + CSV export |
| Legal entities | List with headcount/locations/tax ID; admin add/edit |
| Workflows | Execution engine: worker.hired spawns a country-scoped run, materializes steps + tasks/approvals/notifications, auto-completes when work is done; run detail + 'My tasks' on dashboard; builder visual tab |
| 13th-month pay (PH) | Worksheet: basic earned ÷ 12, ₱90k tax-exempt split, per-year, CSV; from run history when available else prorated |

## Mock / partially wired

| Surface | What's mock | Path to live |
|---|---|---|
| Ask Tenkara (/ai) | Placeholder | LLM assistant over tenant data — needs design |

## Sequenced next

1. **Integrations hardening** — Resend key (emails currently queue), Time
   Doctor field-test, password reset + invite-by-email; SSO/IdP for access
   grants. Biggest blocker to real-world use.
2. **13th-month as an official run** — persist the worksheet as an off-cycle
   payroll run so it lands in payslips and the register.
3. **Workflow builder persistence** — edit/publish definitions to
   workflow_versions (execution + read are done).
4. **Timesheet approval** — weekly manager sign-off before OT feeds payroll.
5. **Mobile/responsive pass**; payslip + COE PDF generation.
6. **Ask Tenkara (/ai)** — deferred per product decision.

## Engineering debt

- `src/lib/data.ts` mock still feeds the remaining mock surfaces; delete once
  pages above are wired.
- Marketing page (`/`) copy + dashboard date strings are static.
- Tests cover the math libs; API routes and RLS policies are untested.
- Seed file is append-ordered; keep new blocks at the bottom (FK order matters).
