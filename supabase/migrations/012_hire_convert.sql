-- Tenkara HCM — 012 hire conversion
-- Link a hired application to the worker record created from it.
alter table public.applications add column hired_worker_id uuid references public.workers(id) on delete set null;
