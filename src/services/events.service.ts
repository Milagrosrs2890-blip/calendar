import { supabase } from '@/lib/supabase'
import type { CalendarEvent, EventInput, Ratification } from '@/types/calendar'

const demoStorageKey = 'qe-calendar-demo-events'

function fromRow(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.id), userId: row.user_id ? String(row.user_id) : null,
    eventDate: String(row.event_date), status: row.status as CalendarEvent['status'], allDay: Boolean(row.all_day),
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
    endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,
    passName: row.pass_name ? String(row.pass_name) : null, jiraTicket: row.jira_ticket ? String(row.jira_ticket) : null,
    jiraLink: row.jira_link ? String(row.jira_link) : null, note: row.note ? String(row.note) : null,
    ratifications: ((row.calendar_event_ratifications ?? []) as Record<string, unknown>[]).map((item) => ({
      id: String(item.id), type: item.ratification_type as Ratification['type'],
      startTime: String(item.start_time).slice(0, 5), endTime: String(item.end_time).slice(0, 5),
    })),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }
}

function demoRead(): CalendarEvent[] {
  try { return JSON.parse(localStorage.getItem(demoStorageKey) ?? '[]') as CalendarEvent[] } catch { return [] }
}

export async function getEvents(from?: string, to?: string): Promise<CalendarEvent[]> {
  if (!supabase) return demoRead().filter((event) => (!from || event.eventDate >= from) && (!to || event.eventDate < to))
  const query = supabase.from('calendar_events').select('*, calendar_event_ratifications(*)').order('event_date')
  if (from) query.gte('event_date', from)
  if (to) query.lt('event_date', to)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => fromRow(row as Record<string, unknown>))
}

export async function saveEvent(input: EventInput): Promise<void> {
  if (!supabase) {
    const current = demoRead()
    const next: CalendarEvent = { ...input, id: input.id ?? crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ratifications: input.ratifications }
    localStorage.setItem(demoStorageKey, JSON.stringify([next, ...current.filter((event) => event.id !== input.id)]))
    return
  }
  const { error } = await supabase.rpc('save_calendar_event', {
    p_event_id: input.id ?? null, p_event_date: input.eventDate, p_status: input.status,
    p_all_day: input.allDay, p_start_time: input.startTime || null, p_end_time: input.endTime || null,
    p_pass_name: input.passName || null, p_jira_ticket: input.jiraTicket || null, p_jira_link: input.jiraLink || null,
    p_note: input.note || null,
    p_ratifications: input.ratifications.map((item) => ({ type: item.type, start_time: item.startTime, end_time: item.endTime })),
  })
  if (error) throw error
}

export async function deleteEvent(id: string): Promise<void> {
  if (!supabase) {
    localStorage.setItem(demoStorageKey, JSON.stringify(demoRead().filter((event) => event.id !== id)))
    return
  }
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw error
}
