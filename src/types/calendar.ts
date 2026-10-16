export type CalendarStatus = 'AVAILABLE' | 'PENDING' | 'UNAVAILABLE' | 'PASS_ASSIGNED' | 'PASS_CANCELLED'
export type RatificationType = 'TOTAL' | 'PARTIAL'
export type RatificationStatus = 'COMPLETED' | 'PENDING' | 'PARTIAL' | 'OBSERVED'

export interface Ratification {
  id?: string
  type: RatificationType
  startTime: string
  endTime: string
  status?: RatificationStatus
  observation?: string | null
  compHours?: number
  compDates?: string[]
}

export interface RatificationRecord {
  key: string
  eventId: string
  type: RatificationType
  eventDate: string
  activity: string
  app: string | null
  flow: string | null
  startTime: string
  endTime: string
  hours: number
  status: RatificationStatus
  observation: string | null
  compHours: number
  compDates: string[]
  jiraTicket: string | null
  jiraLink: string | null
  note: string | null
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
  appCode?: string | null
  appFlow?: 'Regulares' | 'QyG' | null
  jiraTicket?: string | null
  jiraLink?: string | null
  note?: string | null
  isFinished?: boolean
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
  appCode?: string
  appFlow?: 'Regulares' | 'QyG'
  jiraTicket?: string
  jiraLink?: string
  note?: string
  isFinished?: boolean
  ratifications: Ratification[]
}

/** Records that carry a type/application and can be marked as finished. */
export const hasPassDetails = (status: CalendarStatus) => status === 'PASS_ASSIGNED' || status === 'PASS_CANCELLED' || status === 'PENDING'
export const canFinish = (status: CalendarStatus) => status === 'PASS_ASSIGNED' || status === 'PENDING'
export const FINISHED_COLOR = '#8a94a6'

export const PASS_STATUSES: CalendarStatus[] = ['PASS_ASSIGNED', 'PASS_CANCELLED']
export const isPassStatus = (status: CalendarStatus) => PASS_STATUSES.includes(status)

export const STATUS_META: Record<CalendarStatus, { label: string; color: string; description: string }> = {
  AVAILABLE: { label: 'Disponible', color: '#28a56a', description: 'Disponible para trabajar en actividades QE.' },
  PENDING: { label: 'Por confirmar', color: '#e8a51b', description: 'Pendiente de validación o coordinación.' },
  UNAVAILABLE: { label: 'No disponible', color: '#e5484d', description: 'Vacaciones, licencia, feriado u otro.' },
  PASS_ASSIGNED: { label: 'Pase asignado', color: '#3478f6', description: 'Pase o permiso registrado.' },
  PASS_CANCELLED: { label: 'Pase cancelado', color: '#7b8794', description: 'Pase que fue cancelado.' },
}

export const RATIFICATION_STATUS_META: Record<RatificationStatus, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'Completada', color: '#17855a', bg: '#e3f6ec' },
  PENDING: { label: 'Pendiente', color: '#b7791f', bg: '#fff3dc' },
  PARTIAL: { label: 'Parcial', color: '#1d62c8', bg: '#e6f0ff' },
  OBSERVED: { label: 'Con observación', color: '#c0362c', bg: '#fde8e6' },
}

export interface HoursSummary { scheduled: number; compensated: number; diff: number }
