import type { CalendarEvent, HoursSummary, Ratification, RatificationRecord } from '@/types/calendar'

export function ratificationHours(item: Pick<Ratification, 'startTime' | 'endTime'>) {
  const [startHour, startMinute] = item.startTime.split(':').map(Number)
  const [endHour, endMinute] = item.endTime.split(':').map(Number)
  return Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60)
}

export const formatHours = (value: number) => value.toFixed(1)
export const formatHoursLabel = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)} h`

/** Passes that count toward hours: assigned only (cancelled ones are excluded). */
export const isActivePass = (event: CalendarEvent) => event.status === 'PASS_ASSIGNED'

export function passHours(event: CalendarEvent) {
  return event.ratifications.reduce((sum, item) => sum + ratificationHours(item), 0)
}

export function toRatificationRecords(events: CalendarEvent[]): RatificationRecord[] {
  return events.filter(isActivePass).flatMap((event) => event.ratifications.map((item) => ({
    key: `${event.id}:${item.type}`, eventId: event.id, type: item.type, eventDate: event.eventDate,
    activity: event.passName ?? 'Pase', app: event.appCode ?? null, flow: event.appFlow ?? null,
    startTime: item.startTime, endTime: item.endTime, hours: ratificationHours(item),
    status: item.status ?? 'PENDING', observation: item.observation ?? null,
    compHours: item.compHours ?? 0, compDates: item.compDates ?? [], compensations: item.compensations ?? [],
    jiraTicket: event.jiraTicket ?? null, jiraLink: event.jiraLink ?? null, note: event.note ?? null,
  }))).sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.startTime.localeCompare(b.startTime))
}

/** Difference follows the mockup: compensated minus scheduled, so negative means hours still owed. */
export function summarize(records: Pick<RatificationRecord, 'hours' | 'compHours'>[]): HoursSummary {
  const scheduled = records.reduce((sum, item) => sum + item.hours, 0)
  const compensated = records.reduce((sum, item) => sum + item.compHours, 0)
  return { scheduled, compensated, diff: compensated - scheduled }
}

export const monthOf = (isoDate: string) => isoDate.slice(0, 7)

export function monthLabel(month: string) {
  const label = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function shiftMonth(month: string, delta: number) {
  const date = new Date(`${month}-01T12:00:00`)
  date.setMonth(date.getMonth() + delta)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function primaryWindow(event: CalendarEvent): { start: string; end: string; hours: number } | null {
  const item = event.ratifications.find((r) => r.type === 'TOTAL') ?? event.ratifications[0]
  if (item) return { start: item.startTime, end: item.endTime, hours: ratificationHours(item) }
  if (event.startTime && event.endTime) return { start: event.startTime, end: event.endTime, hours: ratificationHours({ startTime: event.startTime, endTime: event.endTime }) }
  return null
}

export function nextPass(events: CalendarEvent[], today: string) {
  return events.filter((event) => isActivePass(event) && !event.isFinished && event.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || (primaryWindow(a)?.start ?? '').localeCompare(primaryWindow(b)?.start ?? ''))[0]
}
