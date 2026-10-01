-- Public calendar data with editor-only writes. Add the editor UUID after creating
-- the Supabase Auth account; see README.md for the setup command.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'EDITOR' check (role in ('EDITOR')),
  created_at timestamptz not null default now()
);

create table if not exists private.calendar_editors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on private.calendar_editors from public, anon, authenticated;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_date date not null,
  status text not null check (status in ('AVAILABLE', 'PENDING', 'UNAVAILABLE', 'PASS_ASSIGNED')),
  all_day boolean not null default false,
  start_time time,
  end_time time,
  pass_name text,
  jira_ticket text,
  jira_link text,
  note varchar(200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_time_pair check ((start_time is null) = (end_time is null)),
  constraint event_time_order check (start_time is null or end_time > start_time),
  constraint all_day_without_hours check (not all_day or start_time is null),
  constraint jira_ticket_format check (jira_ticket is null or jira_ticket ~ '^[A-Z][A-Z0-9_]*-[0-9]+$'),
  constraint jira_link_protocol check (jira_link is null or jira_link ~ '^https?://')
);

create table if not exists public.calendar_event_ratifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  ratification_type text not null check (ratification_type in ('TOTAL', 'PARTIAL')),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint ratification_time_order check (end_time > start_time),
  constraint one_ratification_per_type unique (event_id, ratification_type)
);

create index if not exists calendar_events_event_date_idx on public.calendar_events(event_date);
create index if not exists calendar_events_status_date_idx on public.calendar_events(status, event_date);
create index if not exists calendar_ratifications_event_idx on public.calendar_event_ratifications(event_id);

create or replace function private.is_calendar_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.calendar_editors where user_id = (select auth.uid()));
$$;

create or replace function public.is_calendar_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_calendar_editor(); $$;
revoke all on function public.is_calendar_editor() from public, anon;
grant execute on function public.is_calendar_editor() to authenticated;
revoke all on function private.is_calendar_editor() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_calendar_editor() to authenticated;

alter table public.profiles enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_event_ratifications enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "profiles editor manage" on public.profiles;
create policy "profiles editor manage" on public.profiles for all to authenticated using (private.is_calendar_editor()) with check (private.is_calendar_editor());

drop policy if exists "events public read" on public.calendar_events;
create policy "events public read" on public.calendar_events for select to anon, authenticated using (true);
drop policy if exists "events editor insert" on public.calendar_events;
create policy "events editor insert" on public.calendar_events for insert to authenticated with check (private.is_calendar_editor());
drop policy if exists "events editor update" on public.calendar_events;
create policy "events editor update" on public.calendar_events for update to authenticated using (private.is_calendar_editor()) with check (private.is_calendar_editor());
drop policy if exists "events editor delete" on public.calendar_events;
create policy "events editor delete" on public.calendar_events for delete to authenticated using (private.is_calendar_editor());

drop policy if exists "ratifications public read" on public.calendar_event_ratifications;
create policy "ratifications public read" on public.calendar_event_ratifications for select to anon, authenticated using (true);
drop policy if exists "ratifications editor insert" on public.calendar_event_ratifications;
create policy "ratifications editor insert" on public.calendar_event_ratifications for insert to authenticated with check (private.is_calendar_editor());
drop policy if exists "ratifications editor update" on public.calendar_event_ratifications;
create policy "ratifications editor update" on public.calendar_event_ratifications for update to authenticated using (private.is_calendar_editor()) with check (private.is_calendar_editor());
drop policy if exists "ratifications editor delete" on public.calendar_event_ratifications;
create policy "ratifications editor delete" on public.calendar_event_ratifications for delete to authenticated using (private.is_calendar_editor());

grant select on public.calendar_events, public.calendar_event_ratifications, public.profiles to anon, authenticated;
grant insert, update, delete on public.calendar_events, public.calendar_event_ratifications, public.profiles to authenticated;

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
  if v_event.status = 'PASS_ASSIGNED' then
    if v_event.all_day or v_event.pass_name is null or length(trim(v_event.pass_name)) = 0 then
      raise exception 'A pass requires a description and cannot be all day' using errcode = '23514';
    end if;
    if v_total_count <> 1 then
      raise exception 'A pass requires exactly one TOTAL ratification' using errcode = '23514';
    end if;
    if v_event.start_time is not null or v_event.end_time is not null then
      raise exception 'Pass times belong in ratifications' using errcode = '23514';
    end if;
  elsif v_ratification_count > 0 then
    raise exception 'Only assigned passes can have ratifications' using errcode = '23514';
  end if;
end;
$$;

create or replace function private.check_calendar_event_constraint()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'calendar_events' then
    perform private.assert_calendar_event_valid(coalesce(new.id, old.id));
  else
    perform private.assert_calendar_event_valid(coalesce(new.event_id, old.event_id));
  end if;
  return null;
end;
$$;
revoke all on function private.assert_calendar_event_valid(uuid) from public, anon, authenticated;
revoke all on function private.check_calendar_event_constraint() from public, anon, authenticated;

drop trigger if exists calendar_event_integrity on public.calendar_events;
create constraint trigger calendar_event_integrity after insert or update or delete on public.calendar_events
  deferrable initially deferred for each row execute function private.check_calendar_event_constraint();
drop trigger if exists calendar_ratification_integrity on public.calendar_event_ratifications;
create constraint trigger calendar_ratification_integrity after insert or update or delete on public.calendar_event_ratifications
  deferrable initially deferred for each row execute function private.check_calendar_event_constraint();

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
    insert into public.calendar_event_ratifications (event_id, ratification_type, start_time, end_time)
    values (v_id, v_item->>'type', (v_item->>'start_time')::time, (v_item->>'end_time')::time);
  end loop;
  return v_id;
end;
$$;

revoke all on function public.save_calendar_event(uuid, date, text, boolean, time, time, text, text, text, text, jsonb) from public, anon;
grant execute on function public.save_calendar_event(uuid, date, text, boolean, time, time, text, text, text, text, jsonb) to authenticated;

create or replace function public.save_calendar_events(p_events jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event jsonb;
begin
  if not private.is_calendar_editor() then
    raise exception 'Editor access required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) = 0 then
    raise exception 'Events must be a non-empty array' using errcode = '22023';
  end if;
  for v_event in select value from jsonb_array_elements(p_events) loop
    perform public.save_calendar_event(
      nullif(v_event->>'event_id', '')::uuid,
      (v_event->>'event_date')::date,
      v_event->>'status',
      coalesce((v_event->>'all_day')::boolean, false),
      nullif(v_event->>'start_time', '')::time,
      nullif(v_event->>'end_time', '')::time,
      v_event->>'pass_name', v_event->>'jira_ticket', v_event->>'jira_link', v_event->>'note',
      coalesce(v_event->'ratifications', '[]'::jsonb)
    );
  end loop;
end;
$$;
revoke all on function public.save_calendar_events(jsonb) from public, anon;
grant execute on function public.save_calendar_events(jsonb) to authenticated;
