-- Tenkara HCM — 011 admin-managed memberships
-- Owners/admins can change member roles from the configuration studio.
create policy "admins manage memberships" on public.tenant_users for all
  using (app.is_admin(tenant_id))
  with check (app.is_admin(tenant_id));
