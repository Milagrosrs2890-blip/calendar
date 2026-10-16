import type { CalendarEvent } from '@/types/calendar'
import { isActivePass, monthOf, shiftMonth, summarize, toRatificationRecords } from '@/utils/hours'
import { PASS_TYPES } from '@/config'

export interface StatsFilters { app: string; flow: string }
export interface MonthlyStats {
  passes: number; scheduled: number; compensated: number; diff: number
  byType: { name: string; count: number }[]; byApp: { name: string; count: number }[]
}

function inMonth(events: CalendarEvent[], month: string, filters: StatsFilters) {
  return events.filter((event) => isActivePass(event) && monthOf(event.eventDate) === month
    && (!filters.app || event.appCode === filters.app) && (!filters.flow || event.appFlow === filters.flow))
}

export function getMonthlyStats(events: CalendarEvent[], month: string, filters: StatsFilters): MonthlyStats {
  const passes = inMonth(events, month, filters)
  const hours = summarize(toRatificationRecords(passes))
  const count = (key: (event: CalendarEvent) => string | null | undefined) => {
    const map = new Map<string, number>()
    for (const event of passes) { const name = key(event); if (name) map.set(name, (map.get(name) ?? 0) + 1) }
    return map
  }
  const types = count((event) => event.passName)
  const apps = count((event) => event.appCode)
  return {
    passes: passes.length, scheduled: hours.scheduled, compensated: hours.compensated, diff: hours.diff,
    byType: [...new Set([...PASS_TYPES.slice(0, 7), ...types.keys()])].map((name) => ({ name, count: types.get(name) ?? 0 })).sort((a, b) => b.count - a.count),
    byApp: [...apps].map(([name, value]) => ({ name, count: value })).sort((a, b) => b.count - a.count),
  }
}

export function getMonthlyEvolution(events: CalendarEvent[], endMonth: string, filters: StatsFilters) {
  return Array.from({ length: 6 }, (_, index) => {
    const month = shiftMonth(endMonth, index - 5)
    const stats = getMonthlyStats(events, month, filters)
    const label = new Intl.DateTimeFormat('es', { month: 'short' }).format(new Date(`${month}-01T12:00:00`)).replace('.', '')
    return { month: label.charAt(0).toUpperCase() + label.slice(1), programadas: Number(stats.scheduled.toFixed(1)), compensadas: Number(stats.compensated.toFixed(1)) }
  })
}

export function createCsv(events: CalendarEvent[], month: string, filters: StatsFilters) {
  const rows = [['Fecha', 'Horario', 'Tipo', 'Aplicativo', 'Flujo', 'Ticket Jira', 'Link', 'Estado', 'Nota']]
  for (const event of events.filter((item) => monthOf(item.eventDate) === month && (!filters.app || item.appCode === filters.app) && (!filters.flow || item.appFlow === filters.flow))) {
    const time = event.status.startsWith('PASS')
      ? event.ratifications.map((item) => `${item.type === 'TOTAL' ? 'Total' : 'Parcial'} ${item.startTime}–${item.endTime}`).join(' / ')
      : event.allDay ? 'Todo el día' : `${event.startTime ?? ''}–${event.endTime ?? ''}`
    rows.push([event.eventDate, time, event.passName ?? '', event.appCode ?? '', event.appFlow ?? '', event.jiraTicket ?? '', event.jiraLink ?? '', event.status, event.note ?? ''])
  }
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
}
