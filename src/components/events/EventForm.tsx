import { useMemo, useState, type FormEvent } from 'react'
import { AlertCircle, CalendarDays, Clock3, Copy, ExternalLink, LoaderCircle, Trash2 } from 'lucide-react'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CalendarEvent, CalendarStatus, EventInput, Ratification } from '@/types/calendar'
import { STATUS_META } from '@/types/calendar'
import { saveEvents, deleteEvent } from '@/services/events.service'
import { validateEvent } from '@/utils/validators'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface Props { open: boolean; onOpenChange: (open: boolean) => void; initialDate: string; endDate?: string; event?: CalendarEvent | null; onSaved: () => void }
interface DayTime { date: string; startTime: string; endTime: string }
const statuses = Object.keys(STATUS_META) as CalendarStatus[]
const defaultRatifications: Ratification[] = [{ type: 'TOTAL', startTime: '10:30', endTime: '11:00' }]

export function EventForm({ open, onOpenChange, initialDate, endDate, event, onSaved }: Props) {
  const dates = useMemo(() => {
    if (event) return [event.eventDate]
    try {
      const start = parseISO(initialDate)
      const end = parseISO(endDate || initialDate)
      return eachDayOfInterval({ start, end }).map((date) => format(date, 'yyyy-MM-dd'))
    } catch { return [initialDate] }
  }, [initialDate, endDate, event])
  const [status, setStatus] = useState<CalendarStatus>(event?.status ?? 'AVAILABLE')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [dayTimes, setDayTimes] = useState<DayTime[]>(() => dates.map((date) => ({ date, startTime: event?.startTime ?? '09:00', endTime: event?.endTime ?? '12:00' })))
  const [passName, setPassName] = useState(event?.passName ?? '')
  const [jiraTicket, setJiraTicket] = useState(event?.jiraTicket ?? '')
  const [jiraLink, setJiraLink] = useState(event?.jiraLink ?? '')
  const [note, setNote] = useState(event?.note ?? '')
  const [ratifications, setRatifications] = useState<Ratification[]>(event?.ratifications.length ? event.ratifications : defaultRatifications)
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const isPass = status === 'PASS_ASSIGNED'
  function changeDay(index: number, key: 'startTime' | 'endTime', value: string) {
    setDayTimes((current) => current.map((day, i) => i === index ? { ...day, [key]: value } : day))
  }
  function changeRatification(index: number, key: 'startTime' | 'endTime', value: string) {
    setRatifications((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item))
  }
  function togglePartial() {
    setRatifications((current) => current.some((item) => item.type === 'PARTIAL')
      ? current.filter((item) => item.type !== 'PARTIAL')
      : [...current, { type: 'PARTIAL', startTime: '06:00', endTime: '06:30' }])
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setErrors([])
    const inputs: EventInput[] = dayTimes.map((day) => ({
      id: event?.id, eventDate: day.date, status, allDay: isPass ? false : allDay,
      startTime: isPass ? undefined : (allDay ? undefined : day.startTime), endTime: isPass ? undefined : (allDay ? undefined : day.endTime),
      passName, jiraTicket, jiraLink, note, ratifications: isPass ? ratifications : [],
    }))
    const validation = inputs.flatMap((item) => validateEvent(item))
    if (validation.length) { setErrors([...new Set(validation)]); return }
    setBusy(true)
    try { await saveEvents(inputs); onSaved(); onOpenChange(false) }
    catch (reason) { setErrors([reason instanceof Error ? reason.message : 'No se pudo guardar el evento.']) }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!event) return
    setBusy(true)
    try { await deleteEvent(event.id); onSaved(); onOpenChange(false) }
    catch (reason) { setErrors([reason instanceof Error ? reason.message : 'No se pudo eliminar el evento.']) }
    finally { setBusy(false) }
  }
  async function copyLink() {
    if (!jiraLink) return
    try { await navigator.clipboard.writeText(jiraLink) } catch { setErrors(['No se pudo copiar el enlace.']) }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
    <div className="mb-5 flex items-start gap-3 pr-7"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><CalendarDays size={20} /></div><div><DialogTitle className="text-xl font-bold text-[#11264a]">{event ? 'Editar registro' : 'Registrar disponibilidad o pase'}</DialogTitle><DialogDescription className="mt-1 text-sm text-slate-500">{dates.length > 1 ? `${dates.length} fechas seleccionadas` : format(parseISO(dates[0]), 'EEEE d MMMM yyyy', { locale: es })}</DialogDescription></div></div>
    <form onSubmit={submit} className="space-y-5">
      {!event && dates.length > 1 && <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-900"><Clock3 size={16} />Horario independiente por día</div><div className="max-h-48 space-y-2 overflow-y-auto pr-1">{dayTimes.map((day, index) => <div key={day.date} className="grid grid-cols-[1fr_110px_110px] items-center gap-2"><span className="text-sm capitalize text-slate-600">{format(parseISO(day.date), 'EEE d MMM', { locale: es })}</span><input aria-label={`Inicio ${day.date}`} type="time" className="field-input !h-9" value={day.startTime} onChange={(e) => changeDay(index, 'startTime', e.target.value)} /><input aria-label={`Fin ${day.date}`} type="time" className="field-input !h-9" value={day.endTime} onChange={(e) => changeDay(index, 'endTime', e.target.value)} /></div>)}</div></div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field-label">Estado<select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as CalendarStatus)}>{statuses.map((value) => <option key={value} value={value}>{STATUS_META[value].label}</option>)}</select></label>
        {!isPass && <div className="flex items-center gap-3 self-end pb-2"><input id="all-day" type="checkbox" className="h-4 w-4 accent-[#1268e8]" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /><label htmlFor="all-day" className="text-sm font-medium text-slate-700">Todo el día</label></div>}
      </div>
      {!isPass && !allDay && dates.length === 1 && <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Hora inicio<input type="time" className="field-input" value={dayTimes[0]?.startTime} onChange={(e) => changeDay(0, 'startTime', e.target.value)} /></label><label className="field-label">Hora fin<input type="time" className="field-input" value={dayTimes[0]?.endTime} onChange={(e) => changeDay(0, 'endTime', e.target.value)} /></label></div>}
      {isPass && <div className="space-y-4 rounded-2xl border border-blue-100 bg-[#f5f8ff] p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-[#18345d]">Horarios de ratificación</p><p className="mt-0.5 text-xs text-slate-500">El horario total es obligatorio; el parcial es opcional.</p></div><label className="flex items-center gap-2 text-xs font-semibold text-blue-700"><input type="checkbox" checked={ratifications.some((item) => item.type === 'PARTIAL')} onChange={togglePartial} className="accent-blue-600" />Incluir parcial</label></div>{ratifications.map((item, index) => <div key={item.type} className="grid grid-cols-[1fr_1fr_1fr] items-end gap-3"><span className="pb-3 text-sm font-semibold text-slate-700">{item.type === 'TOTAL' ? 'Total' : 'Parcial'}</span><label className="field-label">Desde<input type="time" className="field-input" value={item.startTime} onChange={(e) => changeRatification(index, 'startTime', e.target.value)} /></label><label className="field-label">Hasta<input type="time" className="field-input" value={item.endTime} onChange={(e) => changeRatification(index, 'endTime', e.target.value)} /></label></div>)}</div>}
      {isPass && <label className="field-label">Nombre o descripción del pase<input className="field-input" placeholder="Ej. Ratificación de procesamiento" value={passName} onChange={(e) => setPassName(e.target.value)} /></label>}
      <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Ticket Jira <span className="font-normal text-slate-400">(opcional)</span><input className="field-input" placeholder="CCCT-2451" value={jiraTicket} onChange={(e) => setJiraTicket(e.target.value.toUpperCase())} /></label><label className="field-label">Link del pase o ticket <span className="font-normal text-slate-400">(opcional)</span><div className="flex gap-2"><input type="url" className="field-input min-w-0" placeholder="https://…" value={jiraLink} onChange={(e) => setJiraLink(e.target.value)} /><Button type="button" variant="outline" size="icon" title="Copiar link" onClick={copyLink} disabled={!jiraLink}><Copy size={16} /></Button>{event?.jiraLink && <Button type="button" variant="outline" size="icon" title="Abrir link" onClick={() => window.open(event.jiraLink!, '_blank', 'noopener,noreferrer')}><ExternalLink size={16} /></Button>}</div></label></div>
      <label className="field-label">Nota breve <span className="font-normal text-slate-400">(opcional)</span><textarea className="field-input min-h-20 resize-y py-3" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Añade información útil para la coordinación…" /><span className="text-right text-xs font-normal text-slate-400">{note.length} / 200</span></label>
      <div className="flex gap-3 rounded-xl bg-blue-50 px-3 py-3 text-xs leading-5 text-blue-900"><AlertCircle className="mt-0.5 shrink-0 text-blue-600" size={16} />Evita colocar información médica o personal sensible en las notas.</div>
      {errors.length > 0 && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">{event ? <Button type="button" variant="destructive" onClick={remove} disabled={busy}><Trash2 size={16} />Eliminar</Button> : <span /> }<div className="flex gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button><Button disabled={busy}>{busy && <LoaderCircle size={16} className="animate-spin" />}{event ? 'Actualizar' : 'Guardar'}</Button></div></div>
    </form>
  </DialogContent></Dialog>
}
