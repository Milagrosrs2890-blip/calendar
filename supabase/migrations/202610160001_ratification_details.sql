-- Ratification tracking (status, observation, compensation) and the cancelled-pass status.

alter table public.calendar_events drop constraint if exists calendar_events_status_check;
alter table public.calendar_events add constraint calendar_events_status_check
  check (status in ('AVAILABLE', 'PENDING', 'UNAVAILABLE', 'PASS_ASSIGNED', 'PASS_CANCELLED'));

alter table public.calendar_event_ratifications
  add column if not exists status text not null default 'PENDING',
  add column if not exists observation varchar(200),
  add column if not exists comp_hours numeric(5,2) not null default 0,
  add column if not exists comp_dates date[] not null default '{}';

alter table public.calendar_event_ratifications
  drop constraint if exists ratification_status_valid,
  add constraint ratification_status_valid check (status in ('COMPLETED', 'PENDING', 'PARTIAL', 'OBSERVED')),
  drop constraint if exists ratification_comp_hours_valid,
  add constraint ratification_comp_hours_valid check (comp_hours >= 0);

create or replace function private.assert_calendar_event_valid(p_event_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_event public.calendar_events%rowtype;
  v_total_count integer;
  v_ratification_count integer;
begin
  select * into v_event from public.calendar_events where id = p_event_id;
  if not found then return; end if;
  select count(*), count(*) filter (where ratification_type = 'TOTAL')
    into v_ratification_count, v_total_count
    from public.calendar_event_ratifications where event_id = p_event_id;
  if v_event.status in ('PASS_ASSIGNED', 'PASS_CANCELLED') then
    if v_event.all_day or v_event.pass_name is null or length(trim(v_event.pass_name)) = 0 then
      raise exception 'A pass requires a type and cannot be all day' using errcode = '23514';
    end if;
    if v_total_count <> 1 then
      raise exception 'A pass requires exactly one TOTAL ratification' using errcode = '23514';
    end if;
    if v_event.start_time is not null or v_event.end_time is not null then
      raise exception 'Pass times belong in ratifications' using errcode = '23514';
    end if;
  elsif v_ratification_count > 0 then
    raise exception 'Only passes can have ratifications' using errcode = '23514';
  end if;
end;
$$;

create or replace function public.save_calendar_event(
  p_event_id uuid,
  p_event_date date,
  p_status text,
  p_all_day boolean,
  p_start_time time,
  p_end_time time,
  p_pass_name text,
  p_jira_ticket text,
  p_jira_link text,
  p_note text,
  p_ratifications jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_user_id uuid;
  v_item jsonb;
begin
  if not private.is_calendar_editor() then
    raise exception 'Editor access required' using errcode = '42501';
  end if;
  v_user_id := auth.uid();
  insert into public.profiles (id, role)
  values (v_user_id, 'EDITOR') on conflict (id) do nothing;
  if p_event_id is null then
    insert into public.calendar_events (user_id, event_date, status, all_day, start_time, end_time, pass_name, jira_ticket, jira_link, note)
    values (v_user_id, p_event_date, p_status, p_all_day, p_start_time, p_end_time, nullif(trim(p_pass_name), ''), nullif(trim(p_jira_ticket), ''), nullif(trim(p_jira_link), ''), nullif(trim(p_note), ''))
    returning id into v_id;
  else
    v_id := p_event_id;
    update public.calendar_events set event_date = p_event_date, status = p_status, all_day = p_all_day,
      start_time = p_start_time, end_time = p_end_time, pass_name = nullif(trim(p_pass_name), ''),
      jira_ticket = nullif(trim(p_jira_ticket), ''), jira_link = nullif(trim(p_jira_link), ''),
      note = nullif(trim(p_note), ''), updated_at = now()
    where id = v_id;
    if not found then raise exception 'Event not found' using errcode = 'P0002'; end if;
    delete from public.calendar_event_ratifications where event_id = v_id;
  end if;
  if jsonb_typeof(coalesce(p_ratifications, '[]'::jsonb)) <> 'array' then
    raise exception 'Ratifications must be an array' using errcode = '22023';
  end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_ratifications, '[]'::jsonb)) loop
    insert into public.calendar_event_ratifications (event_id, ratification_type, start_time, end_time, status, observation, comp_hours, comp_dates)
    values (
      v_id, v_item->>'type', (v_item->>'start_time')::time, (v_item->>'end_time')::time,
      coalesce(nullif(v_item->>'status', ''), 'PENDING'),
      nullif(trim(v_item->>'observation'), ''),
      coalesce(nullif(v_item->>'comp_hours', '')::numeric, 0),
      case when jsonb_typeof(v_item->'comp_dates') = 'array'
        then array(select jsonb_array_elements_text(v_item->'comp_dates'))::date[]
        else '{}'::date[] end
    );
  end loop;
  return v_id;
end;
$$;

revoke all on function public.save_calendar_event(uuid, date, text, boolean, time, time, text, text, text, text, jsonb) from public, anon;
grant execute on function public.save_calendar_event(uuid, date, text, boolean, time, time, text, text, text, text, jsonb) to authenticated;
