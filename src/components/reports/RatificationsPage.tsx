import { useMemo, useState } from 'react'
import { ArrowDownToLine, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, Eye, FileText, LoaderCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { CalendarEvent, RatificationRecord, RatificationStatus } from '@/types/calendar'
import { RATIFICATION_STATUS_META } from '@/types/calendar'
import { createRatificationsCsv, downloadCsv } from '@/services/ratifications.service'
import { deleteRatification } from '@/services/events.service'
import { dateToIso } from '@/utils/validators'
import { monthLabel, monthOf, shiftMonth, summarize, toRatificationRecords } from '@/utils/hours'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { RatificationEditDialog } from '@/components/reports/RatificationEditDialog'

interface Props {
  events: CalendarEvent[]; isEditor: boolean; applications: string[]
  onNew: () => void; onViewEvent: (event: CalendarEvent) => void; onEditEvent: (event: CalendarEvent) => void; onChanged: (notice?: string) => void
}
const currentMonth = dateToIso(new Date()).slice(0, 7)
const statuses = Object.keys(RATIFICATION_STATUS_META) as RatificationStatus[]

export function RatificationsPage({ events, isEditor, applications, onNew, onViewEvent, onEditEvent, onChanged }: Props) {
  const [month, setMonth] = useState(currentMonth)
  const [app, setApp] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<RatificationRecord | null>(null)
  const [deleting, setDeleting] = useState<RatificationRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const all = useMemo(() => toRatificationRecords(events), [events])
  // Re-derive the record being edited so the dialog shows compensations as soon as they change.
  const editingRecord = editing ? all.find((item) => item.key === editing.key) ?? null : null
  const appOptions = useMemo(() => [...new Set([...applications, ...all.flatMap((item) => item.app ? [item.app] : [])])].sort(), [applications, all])
  const inMonth = useMemo(() => all.filter((item) => monthOf(item.eventDate) === month), [all, month])
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return inMonth.filter((item) => (!app || item.app === app) && (!status || item.status === status)
      && (!term || [item.activity, item.app, item.jiraTicket, item.observation, item.note].some((value) => value?.toLowerCase().includes(term))))
  }, [inMonth, app, status, search])
  const count = (...list: RatificationStatus[]) => inMonth.filter((item) => list.includes(item.status)).length
  const cards = [
    { label: 'Total ratificaciones', value: inMonth.length, icon: FileText, tone: 'blue' },
    { label: 'Completadas', value: count('COMPLETED'), icon: CheckCircle2, tone: 'emerald' },
    { label: 'Pendientes', value: count('PENDING', 'PARTIAL'), icon: Clock3, tone: 'amber' },
    { label: 'Con observación', value: count('OBSERVED'), icon: CircleAlert, tone: 'red' },
  ]
  const eventOf = (id: string) => events.find((event) => event.id === id)
  const monthTotals = useMemo(() => summarize(rows), [rows])
  const overallTotals = useMemo(() => summarize(all), [all])
  const owedLabel = (diff: number) => diff < 0 ? `${(-diff).toFixed(1)} h pendientes` : diff > 0 ? `${diff.toFixed(1)} h a favor` : 'Al día'
  async function remove() {
    if (!deleting) return
    setBusy(true); setError('')
    try { await deleteRatification(deleting.eventId, deleting.type); const wasPass = deleting.type === 'TOTAL'; setDeleting(null); onChanged(wasPass ? 'Pase eliminado correctamente.' : 'Ratificación eliminada correctamente.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo eliminar.') }
    finally { setBusy(false) }
  }
  const columns = ['Fecha', 'Actividad', 'Aplicativo', 'Hora inicio', 'Hora fin', 'Horas', 'Comp.', 'Pendiente', 'Ticket Jira', 'Estado', 'Obs.', ...(isEditor ? ['Acciones'] : [])]
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 rounded-xl border border-[#e5eaf1] bg-white p-1"><button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Mes anterior" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={16} /></button><span className="min-w-36 text-center text-sm font-semibold text-[#12294d]">{monthLabel(month)}</span><button className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Mes siguiente" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={16} /></button></div>
      {isEditor && <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-500">Aplicativo<select className="field-input !h-9 !w-28 !text-xs" value={app} onChange={(e) => setApp(e.target.value)}><option value="">Todos</option>{appOptions.map((code) => <option key={code}>{code}</option>)}</select></label>
        <label className="flex items-center gap-2 text-xs text-slate-500">Estado<select className="field-input !h-9 !w-36 !text-xs" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option>{statuses.map((value) => <option key={value} value={value}>{RATIFICATION_STATUS_META[value].label}</option>)}</select></label>
        <div className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="field-input !h-9 !w-52 !pl-8 !text-xs" placeholder="Buscar actividad, ticket…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar" /></div>
        <Button size="sm" onClick={onNew}><Plus size={15} />Nueva ratificación</Button>
        <Button size="sm" variant="outline" onClick={() => downloadCsv(`ratificaciones-${month}.csv`, createRatificationsCsv(rows))}><ArrowDownToLine size={15} />Exportar CSV</Button>
      </div>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <Card key={label} className="flex items-center gap-4 p-4"><div className={`metric-icon metric-${tone}`}><Icon size={20} /></div><div><p className="text-xl font-bold tracking-tight text-[#152d51]">{value}</p><p className="mt-0.5 text-xs text-slate-500">{label}</p></div></Card>)}</div>
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm">
      <thead className="bg-[#f8f9fb] text-xs text-slate-500"><tr>{columns.map((label) => <th className="px-4 py-3 font-semibold" key={label}>{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.map((record) => { const meta = RATIFICATION_STATUS_META[record.status]; const event = eventOf(record.eventId); return <tr key={record.key} className="hover:bg-slate-50/70">
        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format(parseISO(record.eventDate), 'dd/MM/yyyy')}</td>
        <td className="px-4 py-3 font-medium text-slate-700">{record.activity}{record.type === 'PARTIAL' && <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Parcial</span>}</td>
        <td className="px-4 py-3 text-slate-600">{record.app ?? '—'}</td><td className="px-4 py-3 text-slate-600">{record.startTime}</td><td className="px-4 py-3 text-slate-600">{record.endTime}</td>
        <td className="px-4 py-3 font-semibold text-slate-700">{record.hours.toFixed(1)}</td>
        <td className="px-4 py-3 text-slate-600">{record.compHours.toFixed(1)}</td>
        <td className="px-4 py-3 font-semibold">{record.hours - record.compHours > 0
          ? <span className="text-red-600">{(record.hours - record.compHours).toFixed(1)}</span>
          : record.compHours > record.hours ? <span className="text-emerald-700" title="Saldo a favor">+{(record.compHours - record.hours).toFixed(1)}</span> : <span className="text-slate-400">0.0</span>}</td>
        <td className="px-4 py-3">{record.jiraTicket ? (record.jiraLink ? <a className="font-semibold text-blue-600 hover:underline" href={record.jiraLink} target="_blank" rel="noreferrer">{record.jiraTicket}</a> : record.jiraTicket) : '—'}</td>
        <td className="px-4 py-3"><span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: meta.color, backgroundColor: meta.bg }}>{meta.label}</span></td>
        <td className="max-w-56 truncate px-4 py-3 text-slate-500" title={record.observation ?? undefined}>{record.observation || '—'}</td>
        {isEditor && <td className="px-4 py-3"><div className="flex items-center gap-1">
          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Ver en el calendario" title="Ver en el calendario" onClick={() => event && onViewEvent(event)}><Eye size={15} /></button>
          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Editar ratificación" title="Editar ratificación" onClick={() => setEditing(record)}><Pencil size={15} /></button>
          <button className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" aria-label="Eliminar" title={record.type === 'TOTAL' ? 'Eliminar pase' : 'Eliminar ratificación parcial'} onClick={() => { setError(''); setDeleting(record) }}><Trash2 size={15} /></button></div></td>}
      </tr> })}
      {rows.length === 0 && <tr><td colSpan={columns.length} className="px-5 py-14 text-center text-sm text-slate-400"><CalendarDays className="mx-auto mb-2" size={20} />{inMonth.length ? 'Ninguna ratificación coincide con los filtros.' : 'No hay ratificaciones registradas en este mes.'}</td></tr>}</tbody>
    </table></div></Card>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { label: 'Horas del mes', value: `${monthTotals.scheduled.toFixed(1)} h` },
      { label: 'Compensadas del mes', value: `${monthTotals.compensated.toFixed(1)} h` },
      { label: 'Pendiente del mes', value: owedLabel(monthTotals.diff) },
      { label: 'Pendiente acumulado', value: owedLabel(overallTotals.diff) },
    ].map(({ label, value }) => <Card key={label} className="p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-[#152d51]">{value}</p></Card>)}</div>
    <RatificationEditDialog record={editingRecord} onClose={() => setEditing(null)} onSaved={(notice) => onChanged(notice ?? 'Ratificación actualizada.')} onEditPass={(id) => { const event = eventOf(id); setEditing(null); if (event) onEditEvent(event) }} />
    <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !busy) setDeleting(null) }}><DialogContent className="sm:max-w-md"><DialogTitle className="text-lg font-bold text-[#11264a]">{deleting?.type === 'TOTAL' ? '¿Eliminar este pase?' : '¿Eliminar esta ratificación parcial?'}</DialogTitle>
      <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">{deleting?.type === 'TOTAL' ? <>La ratificación total es obligatoria, por lo que se eliminará <strong>todo el pase {deleting?.activity}</strong> con sus ratificaciones.</> : <>Se eliminará el bloque parcial de <strong>{deleting?.activity}</strong>.</>} Esta acción no se puede deshacer.</DialogDescription>
      {error && <p role="alert" className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleting(null)} disabled={busy}>Cancelar</Button><Button variant="destructive" onClick={() => void remove()} disabled={busy}>{busy && <LoaderCircle size={15} className="animate-spin" />}Eliminar</Button></div></DialogContent></Dialog>
  </div>
}
