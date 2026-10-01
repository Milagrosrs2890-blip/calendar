import { useMemo, useState } from 'react'
import { ArrowDownToLine, CalendarDays, Clock3, Ticket, Timer, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CalendarEvent } from '@/types/calendar'
import { STATUS_META } from '@/types/calendar'
import { getMonthlyStatistics, createCsv } from '@/services/reports.service'
import { dateToIso } from '@/utils/validators'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Props { events: CalendarEvent[] }
const currentMonth = dateToIso(new Date()).slice(0, 7)
export function ReportsPage({ events }: Props) {
  const [month, setMonth] = useState(currentMonth)
  const stats = useMemo(() => getMonthlyStatistics(events, month), [events, month])
  const monthEvents = useMemo(() => events.filter((event) => event.eventDate.startsWith(month)).sort((a, b) => a.eventDate.localeCompare(b.eventDate)), [events, month])
  const historical = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(`${month || currentMonth}-01T12:00:00`); date.setMonth(date.getMonth() - (5 - index))
    const key = date.toISOString().slice(0, 7)
    return { month: new Intl.DateTimeFormat('es', { month: 'short' }).format(date), passes: getMonthlyStatistics(events, key).passes }
  }), [events, month])
  function download() {
    const blob = new Blob(['\ufeff', createCsv(monthEvents, month)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `reporte-pases-${month}.csv`; anchor.click(); URL.revokeObjectURL(url)
  }
  const cards = [
    { label: 'Pases del mes', value: stats.passes, icon: Ticket, color: 'blue' },
    { label: 'Días con pase', value: stats.passDays, icon: CalendarDays, color: 'violet' },
    { label: 'Tickets únicos', value: stats.uniqueTickets, icon: TrendingUp, color: 'teal' },
    { label: 'Horas programadas', value: `${stats.scheduledHours.toFixed(1)} h`, icon: Clock3, color: 'amber' },
  ]
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Resumen operativo</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-[#11264a]">Estadísticas y reportes</h2><p className="mt-1 text-sm text-slate-500">Consulta los pases programados y su distribución mensual.</p></div><div className="flex gap-2"><input className="field-input max-w-44" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /><Button variant="outline" onClick={download}><ArrowDownToLine size={16} />Descargar CSV</Button></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, color }) => <Card key={label} className="flex items-center gap-4 p-5"><div className={`metric-icon metric-${color}`}><Icon size={19} /></div><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-[#152d51]">{value}</p></div></Card>)}</div>
    <div className="grid gap-4 xl:grid-cols-2"><Card className="p-5"><div className="mb-5"><h3 className="font-bold text-[#193252]">Pases por día</h3><p className="mt-1 text-xs text-slate-500">Cantidad de registros de pase en el mes seleccionado.</p></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#edf1f6" vertical={false} /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(-2)} tickLine={false} axisLine={false} interval="preserveStartEnd" fontSize={11} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} /><Tooltip labelFormatter={(value) => `Día ${String(value).slice(-2)}`} contentStyle={{ borderRadius: 12, border: '1px solid #e7ebf1' }} /><Bar dataKey="count" name="Pases" fill="#3478f6" radius={[5, 5, 0, 0]} maxBarSize={26} /></BarChart></ResponsiveContainer></div></Card><Card className="p-5"><div className="mb-5"><h3 className="font-bold text-[#193252]">Histórico mensual</h3><p className="mt-1 text-xs text-slate-500">Pases por mes en los últimos seis meses.</p></div><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={historical} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#edf1f6" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7ebf1' }} /><Bar dataKey="passes" name="Pases" fill="#8871ed" radius={[5, 5, 0, 0]} maxBarSize={42} /></BarChart></ResponsiveContainer></div></Card></div>
    <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold text-[#193252]">Reporte del mes</h3><p className="mt-1 text-xs text-slate-500">Disponibilidad y pases registrados.</p></div><Button variant="outline" size="sm" onClick={download}><ArrowDownToLine size={15} />CSV</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[#f8f9fb] text-xs text-slate-500"><tr>{['Fecha', 'Hora', 'Pase', 'Ticket Jira', 'Estado', 'Nota'].map((label) => <th className="px-5 py-3 font-semibold" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{monthEvents.map((event) => <tr key={event.id} className="hover:bg-slate-50/70"><td className="px-5 py-3.5 text-slate-600">{event.eventDate}</td><td className="px-5 py-3.5 text-slate-600">{event.status === 'PASS_ASSIGNED' ? event.ratifications.map((item) => `${item.type === 'TOTAL' ? 'Total' : 'Parcial'} ${item.startTime}–${item.endTime}`).join(' · ') : event.allDay ? 'Todo el día' : `${event.startTime ?? ''}–${event.endTime ?? ''}`}</td><td className="px-5 py-3.5 font-medium text-slate-700">{event.passName ?? '—'}</td><td className="px-5 py-3.5">{event.jiraTicket ? <a className="font-semibold text-blue-600 hover:underline" href={event.jiraLink || undefined} target="_blank" rel="noreferrer">{event.jiraTicket}</a> : '—'}</td><td className="px-5 py-3.5"><span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium" style={{ color: STATUS_META[event.status].color }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_META[event.status].color }} />{STATUS_META[event.status].label}</span></td><td className="max-w-56 truncate px-5 py-3.5 text-slate-500">{event.note || '—'}</td></tr>)}{monthEvents.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400"><Timer className="mx-auto mb-2" size={20} />No hay registros en este mes.</td></tr>}</tbody></table></div></Card>
  </div>
}
