-- Tenkara HCM — 016 nightly maintenance (pg_cron)
-- Warn admins about expiring documents (30/7/1 days out) and auto-close any
-- time entry left open for more than 16 hours.
create extension if not exists pg_cron;

select cron.schedule(
  'tenkara-nightly-maintenance',
  '0 1 * * *',
  $job$
  insert into public.notifications (tenant_id, recipient_user_id, channel, payload, status, sent_at)
  select d.tenant_id, tu.user_id, 'in_app',
    jsonb_build_object(
      'kind', 'doc_expiry',
      'title', 'Document expiring: ' || d.name,
      'body', 'Expires ' || d.expires_on || coalesce(' · ' || p.full_name, ''),
      'link', '/employees' || coalesce('/' || d.worker_id, ''),
      'document_id', d.id),
    'sent', now()
  from public.documents d
  left join public.workers w on w.id = d.worker_id
  left join public.people p on p.id = w.person_id
  join public.tenant_users tu on tu.tenant_id = d.tenant_id and tu.role in ('owner','admin','hr')
  where d.expires_on in (current_date + 30, current_date + 7, current_date + 1);

  update public.time_entries
  set ended_at = started_at + interval '16 hours',
      note = coalesce(note, '') || ' [auto-closed]'
  where ended_at is null and started_at < now() - interval '16 hours';
  $job$
);
