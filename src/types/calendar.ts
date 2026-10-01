export type CalendarStatus = 'AVAILABLE' | 'PENDING' | 'UNAVAILABLE' | 'PASS_ASSIGNED'
export type RatificationType = 'TOTAL' | 'PARTIAL'

export interface Ratification {
  id?: string
  type: RatificationType
  startTime: string
  endTime: string
}

export interface CalendarEvent {
  id: string
  userId?: string | null
  eventDate: string
  status: CalendarStatus
  allDay: boolean
  startTime?: string | null
  endTime?: string | null
  passName?: string | null
  jiraTicket?: string | null
  jiraLink?: string | null
  note?: string | null
  ratifications: Ratification[]
  createdAt: string
  updatedAt: string
}

export interface EventInput {
  id?: string
  eventDate: string
  status: CalendarStatus
  allDay: boolean
  startTime?: string
  endTime?: string
  passName?: string
  jiraTicket?: string
  jiraLink?: string
  note?: string
  ratifications: Ratification[]
}

export interface MonthlyMetrics {
  passes: number
  passDays: number
  uniqueTickets: number
  scheduledHours: number
  daily: { date: string; count: number }[]
}

export const STATUS_META: Record<CalendarStatus, { label: string; color: string; description: string }> = {
  AVAILABLE: { label: 'Disponible', color: '#28a56a', description: 'Disponible para trabajar en actividades QE.' },
  PENDING: { label: 'Por confirmar', color: '#e8a51b', description: 'Pendiente de validación o coordinación.' },
  UNAVAILABLE: { label: 'No disponible', color: '#e5484d', description: 'Vacaciones, licencia, feriado u otro.' },
  PASS_ASSIGNED: { label: 'Pase asignado', color: '#3478f6', description: 'Pase o permiso registrado.' },
}
