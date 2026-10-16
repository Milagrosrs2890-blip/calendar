alter table public.calendar_events
  add column if not exists app_code text,
  add column if not exists app_flow text;

alter table public.calendar_events
  drop constraint if exists calendar_event_app_code_format,
  add constraint calendar_event_app_code_format
    check (app_code is null or app_code ~ '^[A-Z0-9_-]+$'),
  drop constraint if exists calendar_event_app_flow_valid,
  add constraint calendar_event_app_flow_valid
    check (app_flow is null or (app_code is not null and app_code = 'SGCT' and app_flow in ('Regulares', 'QyG')));

create table if not exists public.calendar_applications (
  code text primary key check (code ~ '^[A-Z0-9_-]+$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.calendar_applications (code)
values ('SGCT'), ('CCSG')
on conflict (code) do nothing;

alter table public.calendar_applications enable row level security;
drop policy if exists "applications public read" on public.calendar_applications;
create policy "applications public read" on public.calendar_applications
  for select to anon, authenticated using (true);
drop policy if exists "applications editor insert" on public.calendar_applications;
create policy "applications editor insert" on public.calendar_applications
  for insert to authenticated with check (private.is_calendar_editor() and created_by = auth.uid());

grant select on public.calendar_applications to anon, authenticated;
grant insert on public.calendar_applications to authenticated;

create or replace function public.save_calendar_events(p_events jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event jsonb;
  v_id uuid;
begin
  if not private.is_calendar_editor() then
    raise exception 'Editor access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) = 0 then
    raise exception 'Events must be a non-empty array' using errcode = '22023';
  end if;
  for v_event in select value from jsonb_array_elements(p_events) loop
    v_id := public.save_calendar_event(
      nullif(v_event->>'event_id', '')::uuid,
      (v_event->>'event_date')::date,
      v_event->>'status',
      coalesce((v_event->>'all_day')::boolean, false),
      nullif(v_event->>'start_time', '')::time,
      nullif(v_event->>'end_time', '')::time,
      v_event->>'pass_name', v_event->>'jira_ticket', v_event->>'jira_link', v_event->>'note',
      coalesce(v_event->'ratifications', '[]'::jsonb)
    );
    update public.calendar_events
      set app_code = nullif(v_event->>'app_code', ''),
          app_flow = nullif(v_event->>'app_flow', '')
      where id = v_id;
  end loop;
end;
$$;

revoke all on function public.save_calendar_events(jsonb) from public, anon;
grant execute on function public.save_calendar_events(jsonb) to authenticated;
