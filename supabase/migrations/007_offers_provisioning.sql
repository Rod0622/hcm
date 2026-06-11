-- Tenkara HCM — 007 offers & access provisioning
-- Offer pipeline: customizable job offers emailed to candidates, signed-offer
-- upload (stored in the resumes bucket under {tenant}/offers/...), rejection
-- emails for the rest, and post-hire software access grants (SSO-ready
-- catalog). Email delivery goes through outbound_emails: rows are 'queued'
-- until an email provider (RESEND_API_KEY) is configured, then 'sent'.

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  base_amount numeric(14,2) not null,
  currency text not null default 'USD',
  frequency text not null default 'annual' check (frequency in ('annual','monthly','hourly')),
  start_date date,
  notes text,
  status text not null default 'sent'
    check (status in ('sent','signed','declined','withdrawn')),
  signed_doc_path text,                  -- storage path of the uploaded signed offer
  signed_filename text,
  sent_at timestamptz not null default now(),
  signed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.outbound_emails (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  candidate_id uuid references public.candidates(id) on delete set null,
  kind text not null default 'general' check (kind in ('offer','rejection','general')),
  to_email text not null,
  to_name text,
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  error text,
  sent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- SSO-ready software catalog + per-candidate access grants
create table public.software_apps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  name text not null,
  category text,
  sso boolean not null default true,     -- provisioned through the IdP once SSO lands
  created_at timestamptz not null default now(),
  unique (tenant_id, key)
);

create table public.access_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  app_id uuid not null references public.software_apps(id) on delete cascade,
  status text not null default 'provisioned'
    check (status in ('pending','provisioned','revoked')),
  granted_by uuid references auth.users(id),
  provisioned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, candidate_id, app_id)
);

create index on public.offers (tenant_id, application_id);
create index on public.outbound_emails (tenant_id, candidate_id, created_at desc);
create index on public.access_grants (tenant_id, candidate_id);

create trigger audit_offers after insert or update or delete on public.offers
  for each row execute function app.log_audit();
create trigger audit_access_grants after insert or update or delete on public.access_grants
  for each row execute function app.log_audit();

alter table public.offers enable row level security;
alter table public.outbound_emails enable row level security;
alter table public.software_apps enable row level security;
alter table public.access_grants enable row level security;

do $$
declare t text;
begin
  foreach t in array array['offers','outbound_emails','software_apps','access_grants'] loop
    execute format(
      'create policy "tenant members all" on public.%I for all
         using (tenant_id in (select app.user_tenant_ids()))
         with check (tenant_id in (select app.user_tenant_ids()))', t);
  end loop;
end $$;
