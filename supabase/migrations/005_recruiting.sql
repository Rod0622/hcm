-- Tenkara HCM — 005 recruiting / ATS
-- Job openings with weighted skill keywords, candidates, applications with
-- resume text + match score, and a private storage bucket for resume files.
-- Scoring happens in the app layer (keyword match against opening.keywords);
-- the score and matched/missing terms are persisted on the application.

-- ---------- Openings ----------
create table public.job_openings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  org_unit_id uuid references public.org_units(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  legal_entity_id uuid references public.legal_entities(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','paused','closed')),
  headcount int not null default 1,
  -- [{ "term": "react", "weight": 2, "required": true, "aliases": ["reactjs"] }, ...]
  keywords jsonb not null default '[]',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- Candidates ----------
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  source text not null default 'upload',
  created_at timestamptz not null default now()
);
create unique index candidates_tenant_email_key
  on public.candidates (tenant_id, lower(email)) where email is not null;

-- ---------- Applications ----------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  opening_id uuid not null references public.job_openings(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  status text not null default 'new'
    check (status in ('new','shortlisted','interviewing','offer','hired','rejected')),
  score numeric(5,2),                    -- 0–100 keyword match score
  matched_keywords jsonb not null default '[]',
  missing_keywords jsonb not null default '[]',
  resume_path text,                      -- storage object path in 'resumes' bucket
  resume_filename text,
  resume_text text,                      -- extracted plain text, for re-scoring/search
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index on public.job_openings (tenant_id, status);
create index on public.candidates (tenant_id);
create index on public.applications (tenant_id, opening_id, score desc);
create index on public.applications (candidate_id);

-- ---------- Audit ----------
create trigger audit_job_openings after insert or update or delete on public.job_openings
  for each row execute function app.log_audit();
create trigger audit_applications after insert or update or delete on public.applications
  for each row execute function app.log_audit();

-- ---------- RLS ----------
alter table public.job_openings enable row level security;
alter table public.candidates enable row level security;
alter table public.applications enable row level security;

do $$
declare t text;
begin
  foreach t in array array['job_openings','candidates','applications'] loop
    execute format(
      'create policy "tenant members all" on public.%I for all
         using (tenant_id in (select app.user_tenant_ids()))
         with check (tenant_id in (select app.user_tenant_ids()))', t);
  end loop;
end $$;

-- ---------- Resume storage ----------
-- Private bucket; object paths are namespaced as {tenant_id}/{opening_id}/{application_id}/{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes','resumes', false, 10485760,
        array['application/pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/msword','text/plain','text/markdown'])
on conflict (id) do nothing;

create policy "tenant members read resumes" on storage.objects for select
  using (bucket_id = 'resumes' and (storage.foldername(name))[1]::uuid in (select app.user_tenant_ids()));
create policy "tenant members upload resumes" on storage.objects for insert
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1]::uuid in (select app.user_tenant_ids()));
create policy "tenant members delete resumes" on storage.objects for delete
  using (bucket_id = 'resumes' and (storage.foldername(name))[1]::uuid in (select app.user_tenant_ids()));
