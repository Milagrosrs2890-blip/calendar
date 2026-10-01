import type { CalendarEvent, MonthlyMetrics } from '@/types/calendar'

export function getMonthlyStatistics(events: CalendarEvent[], month: string): MonthlyMetrics {
  const passes = events.filter((event) => event.eventDate.startsWith(month) && event.status === 'PASS_ASSIGNED')
  const uniqueTickets = new Set(passes.map((event) => event.jiraTicket).filter(Boolean)).size
  const dailyMap = new Map<string, number>()
  let scheduledHours = 0
  for (const event of passes) {
    dailyMap.set(event.eventDate, (dailyMap.get(event.eventDate) ?? 0) + 1)
    for (const item of event.ratifications) {
      const [startHour, startMinute] = item.startTime.split(':').map(Number)
      const [endHour, endMinute] = item.endTime.split(':').map(Number)
      scheduledHours += Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60)
    }
  }
  const days = new Date(`${month}-01T12:00:00`).getDate() === 1 ? 31 : new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()
  return {
    passes: passes.length, passDays: dailyMap.size, uniqueTickets, scheduledHours,
    daily: Array.from({ length: days }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, '0')}`
      return { date, count: dailyMap.get(date) ?? 0 }
    }),
  }
}

export function createCsv(events: CalendarEvent[], month: string) {
  const rows = [['Fecha', 'Horario', 'Pase', 'Ticket Jira', 'Link', 'Estado', 'Nota']]
  for (const event of events.filter((item) => item.eventDate.startsWith(month))) {
    const time = event.status === 'PASS_ASSIGNED'
      ? event.ratifications.map((item) => `${item.type === 'TOTAL' ? 'Total' : 'Parcial'} ${item.startTime}–${item.endTime}`).join(' / ')
      : event.allDay ? 'Todo el día' : `${event.startTime ?? ''}–${event.endTime ?? ''}`
    rows.push([event.eventDate, time, event.passName ?? '', event.jiraTicket ?? '', event.jiraLink ?? '', event.status, event.note ?? ''])
  }
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
}
