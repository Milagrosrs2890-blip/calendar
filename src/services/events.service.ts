import { supabase } from '@/lib/supabase'
import type { CalendarEvent, EventInput, Ratification } from '@/types/calendar'

const demoStorageKey = 'qe-calendar-demo-events'
const demoApplicationCodesKey = 'qe-calendar-demo-application-codes'
const defaultApplicationCodes = ['SGCT', 'CCSG']

function fromRow(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.id), userId: row.user_id ? String(row.user_id) : null,
    eventDate: String(row.event_date), status: row.status as CalendarEvent['status'], allDay: Boolean(row.all_day),
    startTime: row.start_time ? String(row.start_time).slice(0, 5) : null,
    endTime: row.end_time ? String(row.end_time).slice(0, 5) : null,
    passName: row.pass_name ? String(row.pass_name) : null, jiraTicket: row.jira_ticket ? String(row.jira_ticket) : null,
    appCode: row.app_code ? String(row.app_code) : null,
    appFlow: row.app_flow === 'Regulares' || row.app_flow === 'QyG' ? row.app_flow : null,
    jiraLink: row.jira_link ? String(row.jira_link) : null, note: row.note ? String(row.note) : null,
    ratifications: ((row.calendar_event_ratifications ?? []) as Record<string, unknown>[]).map((item) => ({
      id: String(item.id), type: item.ratification_type as Ratification['type'],
      startTime: String(item.start_time).slice(0, 5), endTime: String(item.end_time).slice(0, 5),
      status: item.status as Ratification['status'], observation: item.observation ? String(item.observation) : null,
      compHours: Number(item.comp_hours ?? 0), compDates: ((item.comp_dates ?? []) as string[]).map(String),
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

export async function getApplicationCodes(): Promise<string[]> {
  if (!supabase) {
    try {
      const stored = JSON.parse(localStorage.getItem(demoApplicationCodesKey) ?? 'null') as unknown
      if (Array.isArray(stored)) return [...new Set([...defaultApplicationCodes, ...stored.filter((item): item is string => typeof item === 'string')])].sort()
    } catch { /* Use the built-in demo catalog if local storage has invalid data. */ }
    return defaultApplicationCodes
  }
  const { data, error } = await supabase.from('calendar_applications').select('code').order('code')
  if (error) throw error
  return (data ?? []).map((row) => String(row.code))
}

export async function addApplicationCode(code: string): Promise<string> {
  const normalized = code.trim().toUpperCase()
  if (!normalized) throw new Error('Escribe un código de aplicativo.')
  if (!/^[A-Z0-9_-]+$/.test(normalized)) throw new Error('Usa solo letras, números, guiones o guiones bajos.')
  if (!supabase) {
    const current = await getApplicationCodes()
    if (current.includes(normalized)) throw new Error('Ese código ya está en el catálogo.')
    localStorage.setItem(demoApplicationCodesKey, JSON.stringify([...current, normalized].sort()))
    return normalized
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error('Inicia sesión como editora para agregar aplicativos.')
  const { error } = await supabase.from('calendar_applications').insert({ code: normalized, created_by: user.id })
  if (error?.code === '23505') throw new Error('Ese código ya está en el catálogo.')
  if (error) throw error
  return normalized
}

export async function saveEvents(inputs: EventInput[]): Promise<void> {
  if (inputs.length === 0) return
  if (!supabase) {
    const current = demoRead()
    const replacements = inputs.map((input) => ({ ...input, id: input.id ?? crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ratifications: input.ratifications } as CalendarEvent))
    const replacedIds = new Set(inputs.flatMap((input) => input.id ? [input.id] : []))
    localStorage.setItem(demoStorageKey, JSON.stringify([...replacements, ...current.filter((event) => !replacedIds.has(event.id))]))
    return
  }
  const { error } = await supabase.rpc('save_calendar_events', {
    p_events: inputs.map((input) => ({
      event_id: input.id ?? null, event_date: input.eventDate, status: input.status,
      all_day: input.allDay, start_time: input.startTime || null, end_time: input.endTime || null,
      pass_name: input.passName || null, jira_ticket: input.jiraTicket || null, jira_link: input.jiraLink || null,
      app_code: input.appCode || null, app_flow: input.appFlow || null,
      note: input.note || null,
      ratifications: input.ratifications.map((item) => ({
        type: item.type, start_time: item.startTime, end_time: item.endTime, status: item.status ?? 'PENDING',
        observation: item.observation || null, comp_hours: item.compHours ?? 0, comp_dates: item.compDates ?? [],
      })),
    })),
  })
  if (error) throw error
}

export async function saveEvent(input: EventInput): Promise<void> { return saveEvents([input]) }

export async function deleteEvent(id: string): Promise<void> {
  if (!supabase) {
    localStorage.setItem(demoStorageKey, JSON.stringify(demoRead().filter((event) => event.id !== id)))
    return
  }
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw error
}

export function eventToInput(event: CalendarEvent, patch: Partial<EventInput> = {}): EventInput {
  return {
    id: event.id, eventDate: event.eventDate, status: event.status, allDay: event.allDay,
    startTime: event.startTime ?? undefined, endTime: event.endTime ?? undefined, passName: event.passName ?? undefined,
    appCode: event.appCode ?? undefined, appFlow: event.appFlow ?? undefined, jiraTicket: event.jiraTicket ?? undefined,
    jiraLink: event.jiraLink ?? undefined, note: event.note ?? undefined, ratifications: event.ratifications, ...patch,
  }
}

export interface RatificationPatch { status: NonNullable<Ratification['status']>; observation: string; compHours: number; compDates: string[] }

export async function updateRatification(eventId: string, type: Ratification['type'], patch: RatificationPatch): Promise<void> {
  if (!supabase) {
    const events = demoRead().map((event) => event.id !== eventId ? event : {
      ...event, ratifications: event.ratifications.map((item) => item.type === type ? { ...item, ...patch, observation: patch.observation || null } : item),
    })
    localStorage.setItem(demoStorageKey, JSON.stringify(events))
    return
  }
  const { error } = await supabase.from('calendar_event_ratifications')
    .update({ status: patch.status, observation: patch.observation.trim() || null, comp_hours: patch.compHours, comp_dates: patch.compDates })
    .eq('event_id', eventId).eq('ratification_type', type)
  if (error) throw error
}

/** A pass always keeps its TOTAL ratification, so removing it removes the whole pass. */
export async function deleteRatification(eventId: string, type: Ratification['type']): Promise<void> {
  if (type === 'TOTAL') return deleteEvent(eventId)
  if (!supabase) {
    const events = demoRead().map((event) => event.id !== eventId ? event : { ...event, ratifications: event.ratifications.filter((item) => item.type !== type) })
    localStorage.setItem(demoStorageKey, JSON.stringify(events))
    return
  }
  const { error } = await supabase.from('calendar_event_ratifications').delete().eq('event_id', eventId).eq('ratification_type', type)
  if (error) throw error
}
