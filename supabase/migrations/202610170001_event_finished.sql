-- Marks a pass (or pending record) as finished; the calendar renders finished records in grey.
alter table public.calendar_events
  add column if not exists is_finished boolean not null default false;
