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

## Mock / partially wired

| Surface | What's mock | Path to live |
|---|---|---|
| Dashboard (admin widgets) | Headcount chart, payroll banner, stats, approvals list, workflow runs | Wire to live counts + approvals/workflow tables (data already exists) |
| Payroll (admin) | Run review UI uses sample numbers | Wire to payroll_runs/lines/exceptions (seeded); then a calculation engine |
| Compliance | Packs/tasks/audit are sample copy | Wire to compliance_* tables (seeded) |
| Workflows | Builder canvas + runs are sample | Wire run list to workflow_runs; builder persists to workflow_versions |
| Configuration | Field studio table is sample | Wire to object/field_definitions (seeded) |
| Analytics | Placeholder | Aggregate live headcount/attrition/payroll queries |
| Legal entities | Placeholder | CRUD on legal_entities (table live + seeded) |
| Ask Tenkara (/ai) | Placeholder | LLM assistant over tenant data — needs design |

## Sequenced next

1. **Wire admin dashboard to live data** — counts, pending approvals (real
   approvals + leave), running workflows, next pay date. Small, high-visibility.
2. **Wire admin payroll page** — show the seeded Jun 1–15 run (lines,
   exceptions, totals) instead of mock; approve/submit transitions.
3. **Convert-to-employee** — one action on a hired candidate creating the
   worker (entity/position/manager/start from the offer), closing the loop
   recruiting → directory → payroll → PTO.
4. **Wire compliance page** — live packs, statuses, and the audit trail feed.
5. **Legal entities CRUD** — small; unblocks real multi-entity setup.
6. **Wire configuration page** — field definitions list + add-field dialog.
7. **Workflows: run list live** — read side first; builder persistence later.
8. **Analytics v1** — headcount trend, dept mix, leave usage, attendance hours
   from live tables.
9. **Performance module** — review cycles, goals (referenced in role brief;
   not yet modeled).
10. **Integrations hardening** — real Resend key, Time Doctor field-test,
    SSO/IdP design for access grants.

## Engineering debt

- `src/lib/data.ts` mock still feeds the remaining mock surfaces; delete once
  pages above are wired.
- Marketing page (`/`) copy + dashboard date strings are static.
- No automated tests; scoring/extraction libs (`ats.ts`, `resume.ts`,
  `leave.ts`) are the natural first unit-test targets.
- Seed file is append-ordered; keep new blocks at the bottom (FK order matters).
