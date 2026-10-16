import type { RatificationRecord } from '@/types/calendar'
import { RATIFICATION_STATUS_META } from '@/types/calendar'
import { summarize } from '@/utils/hours'

export function getWeekday(dateStr: string): string {
  return new Intl.DateTimeFormat('es', { weekday: 'long' }).format(new Date(`${dateStr}T12:00:00`))
}

export function createRatificationsCsv(records: RatificationRecord[]) {
  const rows = [['Fecha', 'Día', 'Actividad', 'Aplicativo', 'Flujo', 'Tipo', 'Hora inicio', 'Hora fin', 'Horas', 'Estado', 'Horas compensadas', 'Fechas de compensación', 'Ticket Jira', 'Observaciones']]
  for (const r of records) {
    rows.push([r.eventDate, getWeekday(r.eventDate), r.activity, r.app ?? '', r.flow ?? '', r.type === 'TOTAL' ? 'Total' : 'Parcial', r.startTime, r.endTime, r.hours.toFixed(1),
      RATIFICATION_STATUS_META[r.status].label, r.compHours.toFixed(1), r.compDates.join(' | '), r.jiraTicket ?? '', r.observation ?? ''])
  }
  return rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n')
}

export const calculateRatificationTotals = summarize

export function downloadCsv(name: string, csv: string) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name; anchor.click()
  URL.revokeObjectURL(url)
}
