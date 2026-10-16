import { useState, type FormEvent } from 'react'
import { LoaderCircle, Plus, X } from 'lucide-react'
import type { RatificationRecord, RatificationStatus } from '@/types/calendar'
import { RATIFICATION_STATUS_META } from '@/types/calendar'
import { updateRatification } from '@/services/events.service'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface Props { record: RatificationRecord | null; onClose: () => void; onSaved: () => void; onEditPass: (eventId: string) => void }
export function RatificationEditDialog({ record, onClose, onSaved, onEditPass }: Props) {
  return <Dialog open={Boolean(record)} onOpenChange={(open) => { if (!open) onClose() }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
    {record && <Form key={record.key} record={record} onSaved={onSaved} onClose={onClose} onEditPass={onEditPass} />}
  </DialogContent></Dialog>
}

function Form({ record, onSaved, onClose, onEditPass }: Omit<Props, 'record'> & { record: RatificationRecord }) {
  const [status, setStatus] = useState<RatificationStatus>(record.status)
  const [observation, setObservation] = useState(record.observation ?? '')
  const [compHours, setCompHours] = useState(String(record.compHours))
  const [compDates, setCompDates] = useState<string[]>(record.compDates)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    const hours = Number(compHours)
    if (!Number.isFinite(hours) || hours < 0 || hours > 999) { setError('Las horas compensadas deben ser un número válido.'); return }
    if (compDates.some((date) => !date)) { setError('Completa o elimina las fechas de compensación vacías.'); return }
    setBusy(true); setError('')
    try { await updateRatification(record.eventId, record.type, { status, observation, compHours: hours, compDates: [...new Set(compDates)].sort() }); onSaved(); onClose() }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar la ratificación.') }
    finally { setBusy(false) }
  }
  return <>
    <DialogTitle className="text-lg font-bold text-[#11264a]">Editar ratificación</DialogTitle>
    <DialogDescription className="mt-1 text-sm text-slate-500">{record.activity} · {record.eventDate} · {record.type === 'TOTAL' ? 'Total' : 'Parcial'} {record.startTime}–{record.endTime}</DialogDescription>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="field-label">Estado<select className="field-input" value={status} onChange={(e) => setStatus(e.target.value as RatificationStatus)}>{(Object.keys(RATIFICATION_STATUS_META) as RatificationStatus[]).map((value) => <option key={value} value={value}>{RATIFICATION_STATUS_META[value].label}</option>)}</select></label>
      <label className="field-label">Observaciones <span className="font-normal text-slate-400">(opcional)</span><textarea className="field-input min-h-20 resize-y py-3" maxLength={200} value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Ej. Retraso en carga" /><span className="text-right text-xs font-normal text-slate-400">{observation.length} / 200</span></label>
      <label className="field-label">Horas compensadas<input className="field-input" type="number" min="0" step="0.5" value={compHours} onChange={(e) => setCompHours(e.target.value)} /><span className="text-xs font-normal text-slate-400">Horas programadas de este bloque: {record.hours.toFixed(1)}</span></label>
      <div className="space-y-2"><p className="text-[13px] font-semibold text-[#243955]">Fechas de compensación</p>
        {compDates.map((date, index) => <div key={index} className="flex gap-2"><input type="date" aria-label={`Fecha de compensación ${index + 1}`} className="field-input" value={date} onChange={(e) => setCompDates((current) => current.map((item, i) => i === index ? e.target.value : item))} /><Button type="button" variant="outline" size="icon" aria-label="Quitar fecha" onClick={() => setCompDates((current) => current.filter((_, i) => i !== index))}><X size={16} /></Button></div>)}
        <Button type="button" variant="outline" size="sm" onClick={() => setCompDates((current) => [...current, ''])}><Plus size={14} />Agregar fecha</Button></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between"><Button type="button" variant="ghost" onClick={() => onEditPass(record.eventId)}>Editar horario y datos del pase</Button><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button disabled={busy}>{busy && <LoaderCircle size={16} className="animate-spin" />}Guardar</Button></div></div>
    </form>
  </>
}
