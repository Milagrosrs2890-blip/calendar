import { useState, type FormEvent } from 'react'
import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { RatificationRecord, RatificationStatus } from '@/types/calendar'
import { RATIFICATION_STATUS_META } from '@/types/calendar'
import { addCompensation, deleteCompensation, updateRatification } from '@/services/events.service'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface Props { record: RatificationRecord | null; onClose: () => void; onSaved: (notice?: string) => void; onEditPass: (eventId: string) => void }
export function RatificationEditDialog({ record, onClose, onSaved, onEditPass }: Props) {
  return <Dialog open={Boolean(record)} onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
    {record && <Form key={record.key} record={record} onSaved={onSaved} onClose={onClose} onEditPass={onEditPass} />}
  </DialogContent></Dialog>
}

function Form({ record, onSaved, onClose, onEditPass }: Omit<Props, 'record'> & { record: RatificationRecord }) {
  const [status, setStatus] = useState<RatificationStatus>(record.status)
  const [observation, setObservation] = useState(record.observation ?? '')
  const [date, setDate] = useState(record.eventDate)
  const [hours, setHours] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Saldo a favor: negative pending means more hours were compensated than scheduled.
  const pending = record.hours - record.compHours

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    try { await updateRatification(record.eventId, record.type, { status, observation }); onSaved('Ratificación actualizada.'); onClose() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar la ratificación.') }
    finally { setBusy(false) }
  }

  async function addEntry() {
    setBusy(true); setError('')
    try { await addCompensation(record.eventId, record.type, { date, hours: Number(hours) }); setHours(''); onSaved('Compensación registrada.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo registrar la compensación.') }
    finally { setBusy(false) }
  }

  async function removeEntry(compensationId: string) {
    setBusy(true); setError('')
    try { await deleteCompensation(record.eventId, record.type, compensationId); onSaved('Compensación eliminada.') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo eliminar la compensación.') }
    finally { setBusy(false) }
  }

  return <>
    <DialogTitle className="text-lg font-bold text-[#11264a]">Editar ratificación</DialogTitle>
    <DialogDescription className="mt-1 text-sm text-slate-500">{record.activity} · {record.eventDate} · {record.type === 'TOTAL' ? 'Total' : 'Parcial'} {record.startTime}–{record.endTime}</DialogDescription>

    <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-sm">
      <div><p className="text-xs text-slate-500">Programadas</p><p className="font-bold text-[#152d51]">{record.hours.toFixed(1)} h</p></div>
      <div><p className="text-xs text-slate-500">Compensadas</p><p className="font-bold text-emerald-700">{record.compHours.toFixed(1)} h</p></div>
      <div><p className="text-xs text-slate-500">{pending < 0 ? 'Saldo a favor' : 'Pendiente'}</p>
        <p className={`font-bold ${pending > 0 ? 'text-red-600' : 'text-emerald-700'}`}>{Math.abs(pending).toFixed(1)} h</p></div>
    </div>

    <div className="mt-5 space-y-2">
      <p className="text-[13px] font-semibold text-[#243955]">Compensaciones</p>
      {record.compensations.length === 0 && <p className="text-sm text-slate-400">Aún no hay compensaciones registradas.</p>}
      {record.compensations.map((comp) => <div key={comp.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
        <span className="text-slate-600">{format(parseISO(comp.date), 'dd/MM/yyyy')}</span>
        <span className="flex items-center gap-3"><span className="font-semibold text-slate-700">{comp.hours.toFixed(1)} h</span>
          <button type="button" className="rounded-lg p-1 text-red-500 hover:bg-red-50 disabled:opacity-50" aria-label="Eliminar compensación" disabled={busy} onClick={() => void removeEntry(comp.id)}><Trash2 size={14} /></button></span>
      </div>)}
      <div className="grid grid-cols-[1fr_6rem_auto] gap-2 pt-1">
        <input type="date" aria-label="Fecha de compensación" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
        <input type="number" aria-label="Horas compensadas" className="field-input" min="0.5" step="0.5" placeholder="Horas" value={hours} onChange={(e) => setHours(e.target.value)} />
        <Button type="button" variant="outline" disabled={busy || !hours} onClick={() => void addEntry()}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}Agregar</Button>
      </div>
    </div>

    <form onSubmit={submit} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
      <label className="field-label">Estado<select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as RatificationStatus)}>{(Object.keys(RATIFICATION_STATUS_META) as RatificationStatus[]).map((value) => <option key={value} value={value}>{RATIFICATION_STATUS_META[value].label}</option>)}</select>
        <span className="text-xs font-normal text-slate-400">Se actualiza solo según las compensaciones; elige "Con observación" para marcarlo manualmente.</span></label>
      <label className="field-label">Observaciones <span className="font-normal text-slate-400">(opcional)</span><textarea className="field-input min-h-20 resize-y py-3" maxLength={200} value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Ej. Retraso en carga" /><span className="text-right text-xs font-normal text-slate-400">{observation.length} / 200</span></label>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between"><Button type="button" variant="ghost" onClick={() => onEditPass(record.eventId)}>Editar horario y datos del pase</Button><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button disabled={busy}>{busy && <LoaderCircle size={16} className="animate-spin" />}Guardar</Button></div></div>
    </form>
  </>
}
