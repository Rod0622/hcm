-- Tenkara HCM — 019 workflow execution
-- On worker hire, start matching 'worker.hired' workflows: materialize run
-- steps from the version graph and create the real work (tasks, approvals,
-- notifications). Runs auto-complete when all tasks are done and approvals
-- decided. Definitions are country-scoped via trigger_filter {entity.country}.

create function app.start_onboarding(p_worker_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tenant uuid; v_country text; v_manager_user uuid; v_name text;
  v_def record; v_ver record; v_node jsonb; v_run uuid; v_step uuid;
begin
  select w.tenant_id, le.country_code, mw.user_id, p.full_name
    into v_tenant, v_country, v_manager_user, v_name
  from workers w
  join people p on p.id = w.person_id
  left join legal_entities le on le.id = w.legal_entity_id
  left join workers mw on mw.id = w.manager_worker_id
  where w.id = p_worker_id;

  for v_def in
    select d.id, d.trigger_filter
    from workflow_definitions d
    where d.tenant_id = v_tenant and d.status = 'active' and d.trigger_event = 'worker.hired'
  loop
    if v_def.trigger_filter ? 'entity.country'
       and (v_def.trigger_filter->>'entity.country') is distinct from v_country then
      continue;
    end if;

    select wv.id as id, wv.graph as graph into v_ver
    from workflow_versions wv where wv.definition_id = v_def.id
    order by wv.version desc limit 1;
    if v_ver.id is null then continue; end if;

    insert into workflow_runs (tenant_id, definition_id, version_id, subject_type, subject_id, status)
    values (v_tenant, v_def.id, v_ver.id, 'worker', p_worker_id, 'running')
    returning id into v_run;

    for v_node in select * from jsonb_array_elements(v_ver.graph->'nodes') loop
      insert into workflow_run_steps (tenant_id, run_id, node_id, node_type, status, started_at, finished_at)
      values (v_tenant, v_run, v_node->>'id', v_node->>'type',
        case when v_node->>'type' = 'trigger' then 'succeeded' else 'pending' end,
        now(), case when v_node->>'type' = 'trigger' then now() else null end)
      returning id into v_step;

      if v_node->>'type' in ('document','task','integration') then
        insert into tasks (tenant_id, run_step_id, title, description, kind, worker_id, owner_user_id, due_on)
        values (v_tenant, v_step, v_node->>'title',
          'Onboarding step for ' || coalesce(v_name, 'new hire'),
          case v_node->>'type' when 'integration' then 'it' when 'document' then 'document' else 'onboarding' end,
          p_worker_id, v_manager_user, current_date + 7);
      elsif v_node->>'type' = 'approval' then
        insert into approvals (tenant_id, run_step_id, subject, kind, requested_for_worker_id, assignee_user_id, status, due_at)
        values (v_tenant, v_step, v_node->>'title', 'general', p_worker_id, v_manager_user, 'pending', now() + interval '3 days');
        update workflow_run_steps set status = 'waiting' where id = v_step;
      elsif v_node->>'type' = 'notify' then
        if v_manager_user is not null then
          insert into notifications (tenant_id, run_step_id, recipient_user_id, channel, payload, status, sent_at)
          values (v_tenant, v_step, v_manager_user, 'in_app',
            jsonb_build_object('kind','workflow','title', v_node->>'title',
              'body','Onboarding for ' || coalesce(v_name,'new hire'), 'link','/workflows'), 'sent', now());
        end if;
        update workflow_run_steps set status = 'succeeded', finished_at = now() where id = v_step;
      end if;
    end loop;

    if v_manager_user is not null then
      insert into notifications (tenant_id, recipient_user_id, channel, payload, status, sent_at)
      values (v_tenant, v_manager_user, 'in_app',
        jsonb_build_object('kind','workflow','title','Onboarding started: ' || coalesce(v_name,'new hire'),
          'body','Onboarding tasks have been assigned to you.', 'link','/workflows'), 'sent', now());
    end if;
  end loop;
end $$;

create function app.on_worker_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('onboarding','active') then
    perform app.start_onboarding(new.id);
  end if;
  return new;
end $$;

create trigger trg_worker_onboarding after insert on public.workers
  for each row execute function app.on_worker_created();

create function app.maybe_complete_run(p_run uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_run is null then return; end if;
  if not exists (
        select 1 from tasks t join workflow_run_steps s on s.id = t.run_step_id
        where s.run_id = p_run and t.status in ('open','in_progress','blocked'))
     and not exists (
        select 1 from approvals a join workflow_run_steps s on s.id = a.run_step_id
        where s.run_id = p_run and a.status = 'pending') then
    update workflow_run_steps set status = 'succeeded', finished_at = coalesce(finished_at, now())
      where run_id = p_run and status in ('pending','waiting','running');
    update workflow_runs set status = 'completed', finished_at = now(), current_node = null
      where id = p_run and status not in ('completed','cancelled');
  end if;
end $$;

create function app.on_task_resolved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.run_step_id is not null and new.status is distinct from old.status and new.status in ('done','cancelled') then
    update workflow_run_steps set status = 'succeeded', finished_at = now() where id = new.run_step_id;
    perform app.maybe_complete_run((select run_id from workflow_run_steps where id = new.run_step_id));
  end if;
  return new;
end $$;

create trigger trg_task_resolved after update on public.tasks
  for each row execute function app.on_task_resolved();

create function app.on_approval_resolved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.run_step_id is not null and new.status is distinct from old.status and new.status in ('approved','rejected','cancelled','expired') then
    update workflow_run_steps set status = case when new.status = 'rejected' then 'failed' else 'succeeded' end,
      finished_at = now() where id = new.run_step_id;
    perform app.maybe_complete_run((select run_id from workflow_run_steps where id = new.run_step_id));
  end if;
  return new;
end $$;

create trigger trg_approval_resolved after update on public.approvals
  for each row execute function app.on_approval_resolved();

update public.workflow_definitions set trigger_filter = '{"entity.country":"US"}' where key = 'onboarding_us';
update public.workflow_definitions set trigger_filter = '{"entity.country":"PH"}' where key = 'onboarding_ph';
