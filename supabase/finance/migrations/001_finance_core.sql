-- Personal financing tracker — applied to the SEPARATE "Financing" Supabase
-- project (ltmiaktqfpbbvcazcgzp), NOT the HCM project the main
-- supabase/migrations folder targets. Kept here for reference; already
-- applied via the Supabase management API.
--
-- Accessed exclusively from the app server with the secret (service-role)
-- key: RLS is enabled with NO policies and anon / authenticated grants are
-- revoked, so the publishable key can read nothing.

create table people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_me boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);
-- Exactly one "me" row (own capital).
create unique index people_single_me on people ((true)) where is_me;

create table investments (
  id uuid primary key default gen_random_uuid(),
  transaction_date date not null default current_date,
  financer_id uuid not null references people(id),
  principal numeric(14,2) not null check (principal > 0),
  -- Promised to the financer. The amount is authoritative; the rate is the
  -- manual % it was derived from (kept for display/editing).
  interest_rate numeric(8,4),
  interest_amount numeric(14,2) not null default 0 check (interest_amount >= 0),
  maturity_date date not null,
  -- What the business earns on this money over the cycle.
  business_return_rate numeric(8,4),
  business_return_amount numeric(14,2) not null default 0,
  -- Referral cut is outside the financer's interest and not disclosed to them.
  referrer_id uuid references people(id),
  referrer_cut_rate numeric(8,4),
  referrer_cut_amount numeric(14,2) not null default 0 check (referrer_cut_amount >= 0),
  payout_due numeric(14,2) generated always as (principal + interest_amount) stored,
  my_profit numeric(14,2) generated always as (business_return_amount - interest_amount - referrer_cut_amount) stored,
  status text not null default 'active' check (status in ('active','paid')),
  paid_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (referrer_id is distinct from financer_id)
);
create index investments_financer on investments (financer_id);
create index investments_referrer on investments (referrer_id);
create index investments_maturity on investments (maturity_date);

create table bank_loans (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  loan_date date not null default current_date,
  principal numeric(14,2) not null check (principal > 0),
  interest_rate numeric(8,4),
  interest_amount numeric(14,2) not null default 0 check (interest_amount >= 0),
  term_months int not null default 1 check (term_months between 1 and 120),
  repayment text not null default 'lump_sum' check (repayment in ('lump_sum', 'monthly')),
  total_payable numeric(14,2) generated always as (principal + interest_amount) stored,
  status text not null default 'active' check (status in ('active', 'paid')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references bank_loans(id) on delete cascade,
  due_date date not null,
  amount_due numeric(14,2) not null check (amount_due >= 0),
  paid boolean not null default false,
  paid_date date,
  created_at timestamptz not null default now()
);
create index loan_payments_loan on loan_payments (loan_id);
create index loan_payments_due on loan_payments (due_date) where not paid;

alter table people enable row level security;
alter table investments enable row level security;
alter table bank_loans enable row level security;
alter table loan_payments enable row level security;

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

insert into people (name, is_me) values ('Me (own capital)', true);
