import type { RatificationRecord } from '@/types/calendar'

export async function getRatifications(): Promise<RatificationRecord[]> {
  // Mock data based on Excel example - will be replaced with Supabase query later
  return [
    {
      id: '1',
      eventDate: '2026-10-16',
      activity: 'Parches de Windows',
      app: 'SGCT',
      startTime: '09:00',
      endTime: '11:00',
      hours: 2,
      compHours: 2,
      compDates: ['2026-10-17'],
      jiraTicket: 'JIRA-001',
      jiraLink: 'https://jira.example.com/browse/JIRA-001',
      obs1: 'Parcial',
      obs2: 'Completado',
    },
    {
      id: '2',
      eventDate: '2026-10-16',
      activity: 'Parches de Windows',
      app: 'SGCT',
      startTime: '14:00',
      endTime: '16:00',
      hours: 2,
      compHours: 0,
      compDates: null,
      jiraTicket: 'JIRA-001',
      jiraLink: 'https://jira.example.com/browse/JIRA-001',
      obs1: 'Pendiente',
      obs2: 'Falta compensar',
    },
    {
      id: '3',
      eventDate: '2026-10-18',
      activity: 'Parches de Seguridad',
      app: 'VERINT',
      startTime: '10:00',
      endTime: '12:30',
      hours: 2.5,
      compHours: 1.5,
      compDates: ['2026-10-19'],
      jiraTicket: 'JIRA-002',
      jiraLink: 'https://jira.example.com/browse/JIRA-002',
      obs1: 'Parcial',
      obs2: 'En progreso',
    },
    {
      id: '4',
      eventDate: '2026-10-20',
      activity: 'Incorporación de PYME',
      app: 'SGCT',
      startTime: '09:00',
      endTime: '17:00',
      hours: 8,
      compHours: 4,
      compDates: ['2026-10-21', '2026-10-22'],
      jiraTicket: 'JIRA-003',
      jiraLink: 'https://jira.example.com/browse/JIRA-003',
      obs1: 'Total',
      obs2: 'Mitad compensada',
    },
    {
      id: '5',
      eventDate: '2026-10-22',
      activity: 'Validación de Servicios',
      app: 'VERINT',
      startTime: '11:00',
      endTime: '13:00',
      hours: 2,
      compHours: 0,
      compDates: null,
      jiraTicket: 'JIRA-004',
      jiraLink: 'https://jira.example.com/browse/JIRA-004',
      obs1: 'Pendiente',
      obs2: null,
    },
  ]
}

export function calculateRatificationTotals(records: RatificationRecord[]) {
  const totalHours = records.reduce((sum, r) => sum + r.hours, 0)
  const compHours = records.reduce((sum, r) => sum + (r.compHours ?? 0), 0)
  const diffHours = totalHours - compHours
  return { totalHours, compHours, diffHours }
}
