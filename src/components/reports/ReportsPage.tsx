import { useMemo, useState } from 'react'
import { ArrowDownToLine, CalendarDays, ChevronLeft, ChevronRight, Clock3, Sigma, SquareCheckBig } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { CalendarEvent } from '@/types/calendar'
import { createCsv, getMonthlyEvolution, getMonthlyStats } from '@/services/reports.service'
import { downloadCsv } from '@/services/ratifications.service'
import { dateToIso } from '@/utils/validators'
import { formatHours, monthLabel, shiftMonth } from '@/utils/hours'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Props { events: CalendarEvent[]; isEditor: boolean; applications: string[] }
const currentMonth = dateToIso(new Date()).slice(0, 7)
const tooltipStyle = { borderRadius: 12, border: '1px solid #e7ebf1', fontSize: 12 }

export function ReportsPage({ events, isEditor, applications }: Props) {
  const [month, setMonth] = useState(currentMonth)
  const [app, setApp] = useState('')
  const [flow, setFlow] = useState('')
  const filters = useMemo(() => ({ app, flow }), [app, flow])
  const stats = useMemo(() => getMonthlyStats(events, month, filters), [events, month, filters])
  const evolution = useMemo(() => getMonthlyEvolution(events, month, filters), [events, month, filters])
  const appOptions = useMemo(() => [...new Set([...applications, ...events.flatMap((event) => event.appCode ? [event.appCode] : [])])].sort(), [applications, events])
  const cards = [
    { label: 'Pases del mes', value: String(stats.passes), icon: CalendarDays, tone: 'blue' },
    { label: 'Horas programadas', value: `${formatHours(stats.scheduled)} h`, icon: Clock3, tone: 'blue' },
    { label: 'Horas compensadas', value: `${formatHours(stats.compensated)} h`, icon: SquareCheckBig, tone: 'emerald' },
    { label: 'Diferencia', value: `${formatHours(stats.diff)} h`, icon: Sigma, tone: 'violet' },
  ]
  const MonthNav = <div className="flex items-center gap-1 rounded-xl border border-[#e5eaf1] bg-white p-1"><button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Mes anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></button><span className="min-w-36 text-center text-sm font-semibold text-[#12294d]">{monthLabel(month)}</span><button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Mes siguiente" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></button></div>
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">{MonthNav}
      {isEditor && <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-500">Mes<input type="month" className="field-input !h-9 !w-36 !text-xs" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>
        <label className="flex items-center gap-2 text-xs text-slate-500">Aplicativo<select className="field-input !h-9 !w-28 !text-xs" value={app} onChange={(e) => setApp(e.target.value)}><option value="">Todos</option>{appOptions.map((code) => <option key={code}>{code}</option>)}</select></label>
        <label className="flex items-center gap-2 text-xs text-slate-500">Flujo<select className="field-input !h-9 !w-28 !text-xs" value={flow} onChange={(e) => setFlow(e.target.value)}><option value="">Todos</option><option>Regulares</option><option>QyG</option></select></label>
        <Button size="sm" onClick={() => downloadCsv(`reporte-pases-${month}.csv`, createCsv(events, month, filters))}><ArrowDownToLine size={15} />Exportar CSV</Button>
      </div>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <Card key={label} className="flex items-center gap-4 p-4"><div className={`metric-icon metric-${tone}`}><Icon size={20} /></div><div><p className="text-xl font-bold tracking-tight text-[#152d51]">{value}</p><p className="mt-0.5 text-xs text-slate-500">{label}</p></div></Card>)}</div>
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.3fr]">
      <Card className="p-5"><h3 className="mb-4 text-sm font-bold text-[#193252]">Pases por tipo</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.byType} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}><CartesianGrid stroke="#edf1f6" horizontal={false} /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} /><YAxis type="category" dataKey="name" width={118} tickLine={false} axisLine={false} fontSize={11} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f3f6fb' }} /><Bar dataKey="count" name="Pases" fill="#3478f6" radius={[0, 5, 5, 0]} maxBarSize={14} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="p-5"><h3 className="mb-4 text-sm font-bold text-[#193252]">Pases por aplicativo</h3>{stats.byApp.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.byApp} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#edf1f6" vertical={false} /><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f3f6fb' }} /><Bar dataKey="count" name="Pases" fill="#7c6ae6" radius={[5, 5, 0, 0]} maxBarSize={56} /></BarChart></ResponsiveContainer></div> : <p className="flex h-72 items-center justify-center text-xs text-slate-400">Sin pases con aplicativo en este mes.</p>}</Card>
      <Card className="p-5"><h3 className="mb-4 text-sm font-bold text-[#193252]">Evolución mensual de horas</h3><div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={evolution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid stroke="#edf1f6" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} /><YAxis tickLine={false} axisLine={false} fontSize={11} /><Tooltip contentStyle={tooltipStyle} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /><Area type="monotone" dataKey="programadas" name="Programadas" stroke="#3478f6" fill="#3478f6" fillOpacity={0.12} strokeWidth={2} /><Area type="monotone" dataKey="compensadas" name="Compensadas" stroke="#28a56a" fill="#28a56a" fillOpacity={0.12} strokeWidth={2} /></AreaChart></ResponsiveContainer></div></Card>
    </div>
  </div>
}
