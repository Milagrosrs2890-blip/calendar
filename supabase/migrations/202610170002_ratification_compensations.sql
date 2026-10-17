-- Compensation log: each entry is one date + hours compensated against a pass ratification.
-- comp_hours / comp_dates / status on calendar_event_ratifications are kept in sync by trigger.

create table if not exists public.calendar_ratification_compensations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  ratification_type text not null check (ratification_type in ('TOTAL', 'PARTIAL')),
  comp_date date not null,
  comp_hours numeric(5,2) not null check (comp_hours > 0 and comp_hours <= 999),
  created_at timestamptz not null default now()
);

create index if not exists calendar_ratification_comp_event_idx on public.calendar_ratification_compensations(event_id, ratification_type);

-- Keyed by event + type (not by ratification id) so re-saving a pass does not drop its compensations.
create or replace function private.sync_ratification_compensation(p_event_id uuid, p_type text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_total numeric;
  v_dates date[];
begin
  select coalesce(sum(comp_hours), 0), coalesce(array_agg(distinct comp_date order by comp_date), '{}')
    into v_total, v_dates
    from public.calendar_ratification_compensations
    where event_id = p_event_id and ratification_type = p_type;

  update public.calendar_event_ratifications q
    set comp_hours = v_total,
        comp_dates = v_dates,
        status = case
          when q.status = 'OBSERVED' then q.status
          when v_total <= 0 then 'PENDING'
          when v_total >= extract(epoch from (q.end_time - q.start_time)) / 3600 then 'COMPLETED'
          else 'PARTIAL' end
    where q.event_id = p_event_id and q.ratification_type = p_type;
end;
$$;

create or replace function private.on_ratification_compensation_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'DELETE' then
    perform private.sync_ratification_compensation(new.event_id, new.ratification_type);
  end if;
  if tg_op <> 'INSERT' then
    perform private.sync_ratification_compensation(old.event_id, old.ratification_type);
  end if;
  return null;
end;
$$;

drop trigger if exists ratification_compensation_sync on public.calendar_ratification_compensations;
create trigger ratification_compensation_sync
  after insert or delete on public.calendar_ratification_compensations
  for each row execute function private.on_ratification_compensation_change();

alter table public.calendar_ratification_compensations enable row level security;

drop policy if exists "compensations public read" on public.calendar_ratification_compensations;
create policy "compensations public read" on public.calendar_ratification_compensations
  for select to anon, authenticated using (true);
drop policy if exists "compensations editor insert" on public.calendar_ratification_compensations;
create policy "compensations editor insert" on public.calendar_ratification_compensations
  for insert to authenticated with check (private.is_calendar_editor());
drop policy if exists "compensations editor delete" on public.calendar_ratification_compensations;
create policy "compensations editor delete" on public.calendar_ratification_compensations
  for delete to authenticated using (private.is_calendar_editor());

grant select on public.calendar_ratification_compensations to anon, authenticated;
grant insert, delete on public.calendar_ratification_compensations to authenticated;

-- Backfill: existing compensation totals become one entry each (dated at the first comp date).
-- Review them in the app and split them into real entries if needed.
insert into public.calendar_ratification_compensations (event_id, ratification_type, comp_date, comp_hours)
select q.event_id, q.ratification_type,
       coalesce((select min(d) from unnest(q.comp_dates) d), e.event_date),
       q.comp_hours
from public.calendar_event_ratifications q
join public.calendar_events e on e.id = q.event_id
where q.comp_hours > 0
  and not exists (select 1 from public.calendar_ratification_compensations c where c.event_id = q.event_id and c.ratification_type = q.ratification_type);

-- save_calendar_event: after rewriting ratifications, restore their compensation totals from the log.
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
    insert into public.calendar_event_ratifications (event_id, ratification_type, start_time, end_time, status, observation)
    values (
      v_id, v_item->>'type', (v_item->>'start_time')::time, (v_item->>'end_time')::time,
      coalesce(nullif(v_item->>'status', ''), 'PENDING'),
      nullif(trim(v_item->>'observation'), '')
    );
    perform private.sync_ratification_compensation(v_id, v_item->>'type');
  end loop;
  return v_id;
end;
$$;
