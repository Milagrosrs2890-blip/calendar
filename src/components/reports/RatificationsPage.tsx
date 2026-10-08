import { useEffect, useMemo, useState } from 'react'
import { Clock, CheckCircle2, AlertCircle, ArrowDownToLine } from 'lucide-react'
import type { RatificationRecord } from '@/types/calendar'
import { getRatifications, calculateRatificationTotals } from '@/services/ratifications.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function RatificationsPage() {
  const [allRatifications, setAllRatifications] = useState<RatificationRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const data = await getRatifications()
        setAllRatifications(data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const totals = useMemo(() => calculateRatificationTotals(allRatifications), [allRatifications])

  function getWeekday(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00')
    return new Intl.DateTimeFormat('es', { weekday: 'long' }).format(date)
  }

  function download() {
    const headers = ['Fecha', 'Día', 'Actividad', 'App', 'Hora Inicio', 'Hora Fin', 'Horas', 'Horas Comp.', 'Fechas Compen.', 'Nro Ticket', 'Obs1', 'Obs2']
    const rows = allRatifications.map((r) => [
      r.eventDate,
      getWeekday(r.eventDate),
      r.activity || '',
      r.app || '',
      r.startTime,
      r.endTime,
      r.hours.toString(),
      (r.compHours ?? '').toString(),
      (r.compDates?.join(' | ') || ''),
      r.jiraTicket || '',
      r.obs1 || '',
      r.obs2 || '',
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'ratificaciones.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const statsCards = [
    { label: 'Total hrs', value: totals.totalHours.toFixed(1), icon: Clock, color: 'blue' },
    { label: 'Horas Comp', value: totals.compHours.toFixed(1), icon: CheckCircle2, color: 'emerald' },
    { label: 'Dif. Hrs', value: totals.diffHours.toFixed(1), icon: AlertCircle, color: 'amber' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Seguimiento</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#11264a]">Ratificaciones/compensación de horas</h2>
          <p className="mt-1 text-sm text-slate-500">Control de pases, horas y compensaciones registradas.</p>
        </div>
        <Button variant="outline" onClick={download}>
          <ArrowDownToLine size={16} />
          Descargar CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {statsCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="flex items-center gap-4 p-5">
            <div className={`metric-icon metric-${color}`}>
              <Icon size={19} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[#152d51]">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-[#193252]">Detalle de ratificaciones</h3>
            <p className="mt-1 text-xs text-slate-500">Una fila por bloque de horas registrado.</p>
          </div>
          <Button variant="outline" size="sm" onClick={download}>
            <ArrowDownToLine size={15} />
            CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">Cargando ratificaciones…</div>
          ) : allRatifications.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">No hay ratificaciones registradas.</div>
          ) : (
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-[#f8f9fb] text-xs text-slate-500">
                <tr>
                  {['Fecha', 'Día', 'Actividad', 'App', 'Hora Inicio', 'Hora Fin', 'Horas', 'Horas Comp.', 'Fechas Compen.', 'Nro Ticket', 'Obs1', 'Obs2'].map((label) => (
                    <th className="px-5 py-3 font-semibold" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allRatifications.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 text-slate-600">{record.eventDate}</td>
                    <td className="px-5 py-3.5 text-slate-600 capitalize">{getWeekday(record.eventDate)}</td>
                    <td className="px-5 py-3.5 text-slate-700">{record.activity || '—'}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">{record.app || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{record.startTime}</td>
                    <td className="px-5 py-3.5 text-slate-600">{record.endTime}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{record.hours.toFixed(1)}</td>
                    <td className="px-5 py-3.5 text-slate-600">{record.compHours ?? '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{record.compDates?.join(', ') || '—'}</td>
                    <td className="px-5 py-3.5">
                      {record.jiraTicket ? (
                        <a className="font-semibold text-blue-600 hover:underline" href={record.jiraLink || undefined} target="_blank" rel="noreferrer">
                          {record.jiraTicket}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-56 truncate px-5 py-3.5 text-slate-500">{record.obs1 || '—'}</td>
                    <td className="max-w-56 truncate px-5 py-3.5 text-slate-500">{record.obs2 || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
