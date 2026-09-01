-- PTO Tracker — row-level security.
-- RLS is the floor; the app layer re-checks the same invariants.

alter table public.profiles enable row level security;
alter table public.pto_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.app_settings enable row level security;

-- ---------------------------------------------------------------- profiles
-- Employees see themselves; admins see everyone. Only admins mutate
-- profiles (role, hire date, active flag). Names for the team calendar
-- flow through the SECURITY DEFINER calendar_entries()/employee_directory()
-- functions instead of a broad select policy.

create policy "profiles: self or admin can read"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles: admin can update"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------- requests

create policy "pto_requests: self or admin can read"
  on public.pto_requests for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- New requests are always your own and always start pending, undecided.
create policy "pto_requests: file own request"
  on public.pto_requests for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and decided_by is null
    and decided_at is null
  );

-- Employees may edit or cancel a request only while it is pending, and
-- may not decide it themselves.
create policy "pto_requests: edit or cancel own pending"
  on public.pto_requests for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (
    user_id = (select auth.uid())
    and status in ('pending', 'cancelled')
    and decided_by is null
  );

create policy "pto_requests: admin can update"
  on public.pto_requests for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "pto_requests: admin can delete"
  on public.pto_requests for delete
  to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------ announcements

create policy "announcements: everyone reads live posts, admins read all"
  on public.announcements for select
  to authenticated
  using (
    public.is_admin()
    or (not archived and (expires_at is null or expires_at > now()))
  );

create policy "announcements: admin writes"
  on public.announcements for insert
  to authenticated
  with check (public.is_admin());

create policy "announcements: admin updates"
  on public.announcements for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "announcements: admin deletes"
  on public.announcements for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- settings

create policy "app_settings: everyone reads"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "app_settings: admin updates"
  on public.app_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
