import { useState, type ReactNode } from 'react'
import { Bell, CalendarDays, Clock3, ExternalLink, LoaderCircle, Pencil, Plus, Smartphone, Trash2, Ticket, Workflow, Rows3, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CalendarEvent, CalendarStatus } from '@/types/calendar'
import { STATUS_META, isPassStatus } from '@/types/calendar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatHours, formatHoursLabel, monthLabel, primaryWindow } from '@/utils/hours'
import type { HoursSummary } from '@/types/calendar'

const longDate = (iso: string) => { const text = format(parseISO(iso), "EEE, d 'de' MMMM 'de' yyyy", { locale: es }); return text.charAt(0).toUpperCase() + text.slice(1) }
const scheduleText = (event: CalendarEvent) => {
  if (event.allDay) return 'Todo el día'
  const window = primaryWindow(event)
  return window ? `${window.start} - ${window.end}${isPassStatus(event.status) ? ` (${formatHoursLabel(window.hours)})` : ''}` : '—'
}
const reminderKey = 'qe-calendar-reminders'
const reminderItems = [{ id: 'h24', label: 'Notificación 24 h antes', icon: Bell }, { id: 'h1', label: 'Notificación 1 h antes', icon: Bell }, { id: 'phone', label: 'Notificación por celular', icon: Smartphone }]
type ReminderState = Record<string, boolean>
function loadReminders(): ReminderState {
  try { return { h24: true, h1: true, phone: true, ...(JSON.parse(localStorage.getItem(reminderKey) ?? '{}') as ReminderState) } } catch { return { h24: true, h1: true, phone: true } }
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid grid-cols-[88px_1fr] items-center gap-2 py-1.5 text-xs"><span className="text-slate-500">{label}</span><span className="min-w-0 font-medium text-[#1a2d4d]">{children}</span></div>
}
function StatusChip({ status }: { status: CalendarStatus }) {
  const { color, label } = STATUS_META[status]
  return <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ color, backgroundColor: `${color}1c` }}>{label}</span>
}

interface Props {
  isEditor: boolean; dayEvents: CalendarEvent[]; selectedDate: string; selectedEvent: CalendarEvent | null; nextPass?: CalendarEvent
  hours: HoursSummary; month: string
  onSelectEvent: (event: CalendarEvent) => void; onNew: () => void; onEdit: (event: CalendarEvent) => void
  onChangeStatus: (event: CalendarEvent, status: CalendarStatus) => Promise<void>; onDelete: (event: CalendarEvent) => Promise<void>; onSeeAll: () => void
}

export function CalendarSidePanel({ isEditor, dayEvents, selectedDate, selectedEvent, nextPass, hours, month, onSelectEvent, onNew, onEdit, onChangeStatus, onDelete, onSeeAll }: Props) {
  const [reminders, setReminders] = useState(loadReminders)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  function toggleReminder(id: string) {
    const next = { ...reminders, [id]: !reminders[id] }
    setReminders(next)
    try { localStorage.setItem(reminderKey, JSON.stringify(next)) } catch { /* Reminder preferences are optional. */ }
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action() } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo completar la acción.') } finally { setBusy(false) }
  }
  const event = selectedEvent
  const isPass = event ? isPassStatus(event.status) : false
  const statusOptions: CalendarStatus[] = isPass ? ['PASS_ASSIGNED', 'PASS_CANCELLED'] : ['AVAILABLE', 'PENDING', 'UNAVAILABLE']
  const nextWindow = nextPass ? primaryWindow(nextPass) : null

  return <div className="space-y-4">
    <Card className="p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-[#193252]">Próximo pase</h3>{isEditor ? <Button size="sm" className="h-8" onClick={onNew}><Plus size={14} />Nuevo</Button> : <button className="text-xs font-semibold text-blue-600 hover:underline" onClick={onSeeAll}>Ver todos →</button>}</div>
      {nextPass && nextWindow ? <button className="w-full space-y-2 text-left" onClick={() => onSelectEvent(nextPass)}>
        <p className="flex items-center gap-2 text-xs text-slate-600"><CalendarDays size={14} className="text-slate-400" />{longDate(nextPass.eventDate)}</p>
        <p className="flex items-center gap-2 text-xs text-slate-600"><Clock3 size={14} className="text-slate-400" />{nextWindow.start} - {nextWindow.end} ({formatHoursLabel(nextWindow.hours)})<span className="ml-auto"><StatusChip status={nextPass.status} /></span></p>
        {nextPass.appCode && <p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Workflow size={14} className="text-slate-400" />{nextPass.appCode}</p>}
        <p className="flex items-center gap-2 text-xs text-slate-600"><Rows3 size={14} className="text-slate-400" />{nextPass.passName}{nextPass.note ? ` – ${nextPass.note}` : ''}</p>
      </button> : <p className="py-3 text-center text-xs text-slate-400">No hay pases próximos.</p>}
    </Card>

    <Card className="p-4"><h3 className="mb-1 text-sm font-bold text-[#193252]">Detalle del día / Pase seleccionado</h3><p className="mb-2 text-xs text-slate-500">{longDate(selectedDate)}</p>
      {dayEvents.length > 1 && <div className="mb-2 flex flex-wrap gap-1.5">{dayEvents.map((item) => <button key={item.id} onClick={() => onSelectEvent(item)} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${item.id === event?.id ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{item.passName || STATUS_META[item.status].label}</button>)}</div>}
      {event ? <div className="divide-y divide-slate-100">
        <Row label="Tipo">{event.passName || STATUS_META[event.status].label}</Row>
        {isPass && <Row label="Aplicativo">{event.appCode ?? '—'}</Row>}
        {isPass && <Row label="Flujo">{event.appFlow ?? '—'}</Row>}
        <Row label="Horario">{scheduleText(event)}</Row>
        <Row label="Estado">{isEditor ? <select className="field-input !h-8 !rounded-lg !px-2 !text-xs" value={event.status} disabled={busy} aria-label="Estado" onChange={(e) => void run(() => onChangeStatus(event, e.target.value as CalendarStatus))}>{statusOptions.map((value) => <option key={value} value={value}>{STATUS_META[value].label}</option>)}</select> : <StatusChip status={event.status} />}</Row>
        {event.jiraTicket && <Row label="Ticket Jira">{event.jiraLink ? <a className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline" href={event.jiraLink} target="_blank" rel="noreferrer">{event.jiraTicket}<ExternalLink size={11} /></a> : event.jiraTicket}</Row>}
        {event.note && <Row label="Descripción"><span className="font-normal leading-5 text-slate-600">{event.note}</span></Row>}
        {isEditor && <div className="flex flex-wrap gap-2 pt-3"><Button size="sm" className="h-8" onClick={() => onEdit(event)}><Pencil size={13} />Editar</Button>
          {event.jiraLink && <Button size="sm" variant="outline" className="h-8" onClick={() => window.open(event.jiraLink!, '_blank', 'noopener,noreferrer')}><Ticket size={13} />Abrir ticket</Button>}
          {event.status === 'PASS_ASSIGNED' && <Button size="sm" variant="destructive" className="h-8" disabled={busy} onClick={() => void run(() => onChangeStatus(event, 'PASS_CANCELLED'))}><X size={13} />Cancelar</Button>}
          <Button size="sm" variant="destructive" className="h-8" aria-label="Eliminar registro" onClick={() => setConfirmDelete(true)}><Trash2 size={13} /></Button></div>}
        {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </div> : <p className="py-4 text-center text-xs text-slate-400">{dayEvents.length ? 'Selecciona un registro del día.' : 'Sin registros para este día.'}{isEditor && <> <button className="font-semibold text-blue-600 hover:underline" onClick={onNew}>Agregar</button></>}</p>}
    </Card>

    <Card className="p-4"><h3 className="mb-3 text-sm font-bold text-[#193252]">Recordatorios y notificaciones</h3><ul className="space-y-2.5">
      {reminderItems.map(({ id, label, icon: Icon }) => <li key={id} className="flex items-center gap-2.5 text-xs text-slate-600"><Icon size={14} className="text-slate-400" /><span className="flex-1">{label}</span>
        {isEditor ? <button role="switch" aria-checked={reminders[id]} aria-label={label} onClick={() => toggleReminder(id)} className={`relative h-5 w-9 rounded-full transition-colors ${reminders[id] ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${reminders[id] ? 'left-[18px]' : 'left-0.5'}`} /></button>
          : <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${reminders[id] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{reminders[id] ? 'Activo' : 'Inactivo'}</span>}</li>)}
    </ul><p className="mt-3 text-[11px] text-slate-400">{isEditor ? 'Las alertas se gestionan según tu configuración.' : 'Las alertas se gestionan en modo editor.'}</p></Card>

    <Card className="p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-[#193252]">Resumen de horas <span className="font-normal text-slate-500">({monthLabel(month)})</span></h3><button className="text-xs font-semibold text-blue-600 hover:underline" onClick={onSeeAll}>Ver todo →</button></div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-blue-50 px-1 py-2.5"><p className="text-xl font-bold text-blue-700">{formatHours(hours.scheduled)}</p><p className="text-[10px] text-slate-500">Total hrs</p></div>
        <div className="rounded-xl bg-emerald-50 px-1 py-2.5"><p className="text-xl font-bold text-emerald-700">{formatHours(hours.compensated)}</p><p className="text-[10px] text-slate-500">Horas comp.</p></div>
        <div className={`rounded-xl px-1 py-2.5 ${hours.diff < 0 ? 'bg-red-50' : 'bg-slate-50'}`}><p className={`text-xl font-bold ${hours.diff < 0 ? 'text-red-600' : 'text-slate-700'}`}>{formatHours(hours.diff)}</p><p className="text-[10px] text-slate-500">Dif. hrs pte.</p></div>
      </div></Card>

    <Dialog open={confirmDelete} onOpenChange={(next) => { if (!busy) setConfirmDelete(next) }}><DialogContent className="sm:max-w-md"><DialogTitle className="text-lg font-bold text-[#11264a]">¿Eliminar este registro?</DialogTitle>
      <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">{event && <>Se eliminará <strong>{event.passName || STATUS_META[event.status].label}</strong> del {format(parseISO(event.eventDate), 'd MMMM yyyy', { locale: es })}{isPass ? ', incluidas sus ratificaciones' : ''}. Esta acción no se puede deshacer.</>}</DialogDescription>
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancelar</Button><Button variant="destructive" disabled={busy} onClick={() => event && void run(async () => { await onDelete(event); setConfirmDelete(false) })}>{busy && <LoaderCircle size={15} className="animate-spin" />}Eliminar</Button></div></DialogContent></Dialog>
  </div>
}
