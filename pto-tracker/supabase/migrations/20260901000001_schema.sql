-- PTO Tracker — core schema.
-- Accrual model: 0.5 PTO credits per completed month of tenure,
-- counted from date_hired (monthly anniversaries). 6 credits/year.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  full_name text not null,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  date_hired date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per account, created by trigger on auth.users.';

-- True when the calling user is an admin. SECURITY DEFINER so RLS
-- policies on profiles can call it without recursing into themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

-- Creates the profile row on signup from the auth metadata the app sends.
-- The very first account becomes the admin; everyone after is an employee.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, date_hired, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'date_hired', '')::date,
    case when exists (select 1 from public.profiles) then 'employee' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- requests

create type public.pto_request_type as enum ('pto', 'unpaid', 'offset');
create type public.pto_request_status as enum ('pending', 'approved', 'denied', 'cancelled');

create table public.pto_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.pto_request_type not null,
  start_date date not null,
  end_date date not null,
  days numeric(5, 2) not null default 0,
  reason text,
  proof_path text,
  -- For 'offset' requests: the day (e.g. a weekend day in the same
  -- bi-weekly cutoff) the employee will work instead to keep 80 hrs.
  offset_date date,
  status public.pto_request_status not null default 'pending',
  admin_note text,
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint valid_range check (end_date >= start_date),
  constraint offset_needs_date check (type <> 'offset' or offset_date is not null)
);

create index pto_requests_user_idx on public.pto_requests (user_id, status);
create index pto_requests_dates_idx on public.pto_requests (start_date, end_date);

-- Weekdays (Mon–Fri) between two dates, inclusive. PTO is counted in
-- business days; weekends never consume credits.
create or replace function public.business_days(d1 date, d2 date)
returns numeric
language sql
immutable
as $$
  select coalesce(count(*), 0)::numeric
  from generate_series(d1, d2, interval '1 day') g
  where extract(isodow from g) < 6;
$$;

-- Keep days in sync with the requested range.
create or replace function public.set_request_days()
returns trigger
language plpgsql
as $$
begin
  new.days := public.business_days(new.start_date, new.end_date);
  return new;
end;
$$;

create trigger pto_requests_set_days
  before insert or update of start_date, end_date on public.pto_requests
  for each row execute function public.set_request_days();

-- ---------------------------------------------------------------- balances

-- Credits accrued to date: 0.5 per completed month since hire.
create or replace function public.accrued_credits(hired date)
returns numeric
language sql
stable
as $$
  select case
    when hired is null or hired > current_date then 0
    else (extract(year from age(current_date, hired)) * 12
        + extract(month from age(current_date, hired)))::numeric * 0.5
  end;
$$;

-- Balance for one user. SECURITY INVOKER on purpose: RLS on
-- pto_requests/profiles already scopes what the caller can see, so
-- employees can only resolve their own balance while admins resolve anyone's.
create or replace function public.pto_balance(target uuid)
returns table (accrued numeric, used numeric, pending numeric, available numeric)
language sql
stable
as $$
  with p as (
    select public.accrued_credits(date_hired) as accrued
    from public.profiles where id = target
  ),
  r as (
    select
      coalesce(sum(days) filter (where status = 'approved'), 0) as used,
      coalesce(sum(days) filter (where status = 'pending'), 0) as pending
    from public.pto_requests
    where user_id = target and type = 'pto'
  )
  select p.accrued, r.used, r.pending, p.accrued - r.used - r.pending
  from p, r;
$$;

-- ---------------------------------------------------------------- calendar

-- Team calendar feed: everyone can see WHO is out and WHEN, but not why.
-- SECURITY DEFINER because employees cannot read each other's requests or
-- profiles directly; this returns only the safe columns.
create or replace function public.calendar_entries(from_date date, to_date date)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  type public.pto_request_type,
  status public.pto_request_status,
  start_date date,
  end_date date,
  offset_date date
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.user_id, p.full_name, r.type, r.status,
         r.start_date, r.end_date, r.offset_date
  from public.pto_requests r
  join public.profiles p on p.id = r.user_id
  where auth.uid() is not null
    and r.status in ('pending', 'approved')
    and r.start_date <= to_date
    and r.end_date >= from_date;
$$;

-- Directory of names for the app shell / admin screens.
create or replace function public.employee_directory()
returns table (id uuid, full_name text, username text)
language sql
stable
security definer
set search_path = public
as $$
  select id, full_name, username
  from public.profiles
  where auth.uid() is not null and active
  order by full_name;
$$;

-- ------------------------------------------------------------ announcements

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  media_path text,
  media_type text check (media_type in ('image', 'video')),
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger announcements_touch
  before update on public.announcements
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- settings

-- Single-row payroll settings. The bi-weekly cutoff grid is anchored on
-- one known cutoff start; paydays land pay_delay_days after a cutoff ends.
-- Current anchor: Aug 23 – Sep 5 cutoff, paid Sep 11 (6 days later).
create table public.app_settings (
  id boolean primary key default true check (id), -- enforce one row
  cutoff_anchor date not null default '2026-08-23',
  cutoff_days int not null default 14,
  hours_per_cutoff int not null default 80,
  pay_delay_days int not null default 6,
  monthly_accrual numeric(4, 2) not null default 0.5
);

insert into public.app_settings (id) values (true);
