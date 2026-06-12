-- Tenkara HCM — 018 login provisioning
-- Admin-gated RPC that creates a worker's auth login (user + identity, same
-- shape GoTrue produces), adds the member tenant role, and links the worker.
-- Until an email provider is connected the temp password is handed over
-- by the admin.
create function public.provision_worker_login(p_worker_id uuid, p_email text, p_password text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant uuid;
  v_name text;
  v_user uuid;
begin
  select w.tenant_id, p.full_name into v_tenant, v_name
  from workers w join people p on p.id = w.person_id where w.id = p_worker_id;
  if v_tenant is null then
    raise exception 'Worker not found';
  end if;
  if not app.is_admin(v_tenant) then
    raise exception 'Admin access required';
  end if;
  if length(coalesce(p_password, '')) < 10 then
    raise exception 'Password must be at least 10 characters';
  end if;
  if exists (select 1 from auth.users where lower(email) = lower(p_email)) then
    raise exception 'A login already exists for %', p_email;
  end if;

  v_user := gen_random_uuid();
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
    lower(p_email), extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', v_name),
    now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_user, v_user,
    jsonb_build_object('sub', v_user, 'email', lower(p_email), 'email_verified', true),
    'email', now(), now(), now());
  insert into tenant_users (tenant_id, user_id, role) values (v_tenant, v_user, 'member')
  on conflict do nothing;
  update workers set user_id = v_user where id = p_worker_id;
  return v_user;
end $$;

revoke execute on function public.provision_worker_login(uuid, text, text) from anon, public;
grant execute on function public.provision_worker_login(uuid, text, text) to authenticated;
