import type { EventInput } from '@/types/calendar'

export function validateEvent(input: EventInput): string[] {
  const errors: string[] = []
  if (!input.eventDate) errors.push('Selecciona una fecha.')
  if (input.status === 'PASS_ASSIGNED') {
    if (!input.passName?.trim()) errors.push('Añade una descripción para el pase.')
    if (input.allDay) errors.push('Un pase debe tener horario.')
    if (!input.ratifications.some((item) => item.type === 'TOTAL')) errors.push('Añade el horario de ratificación total.')
  } else if (!input.allDay) {
    if (!input.startTime || !input.endTime) errors.push('Completa la hora de inicio y fin.')
    else if (input.endTime <= input.startTime) errors.push('La hora de fin debe ser posterior a la de inicio.')
  }
  for (const item of input.ratifications) {
    if (!item.startTime || !item.endTime || item.endTime <= item.startTime) {
      errors.push(`Revisa el horario de ratificación ${item.type === 'TOTAL' ? 'total' : 'parcial'}.`)
    }
  }
  if (input.jiraTicket && !/^[A-Z][A-Z0-9_]*-\d+$/.test(input.jiraTicket)) errors.push('El ticket Jira debe tener formato PROYECTO-123.')
  if (input.jiraLink) {
    try {
      const parsed = new URL(input.jiraLink)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
    } catch { errors.push('El link debe comenzar con http:// o https://.') }
  }
  if ((input.note?.length ?? 0) > 200) errors.push('La nota no puede superar los 200 caracteres.')
  return [...new Set(errors)]
}

export function dateToIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
