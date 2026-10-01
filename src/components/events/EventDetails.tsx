import { CalendarDays, Clock3, Copy, ExternalLink, Ticket } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { CalendarEvent } from '@/types/calendar'
import { STATUS_META } from '@/types/calendar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

interface Props { event: CalendarEvent | null; open: boolean; onOpenChange: (open: boolean) => void; isEditor: boolean; onEdit: () => void }
export function EventDetails({ event, open, onOpenChange, isEditor, onEdit }: Props) {
  if (!event) return null
  const meta = STATUS_META[event.status]
  async function copy() { if (event?.jiraLink) await navigator.clipboard.writeText(event.jiraLink) }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <div className="flex items-start gap-3 pr-6"><span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: meta.color, boxShadow: `0 0 0 5px ${meta.color}18` }} /><div><DialogTitle className="text-xl font-bold text-[#11264a]">{event.passName || meta.label}</DialogTitle><DialogDescription className="mt-1 capitalize">{format(parseISO(event.eventDate), 'EEEE d MMMM yyyy', { locale: es })}</DialogDescription></div></div>
    <div className="mt-6 space-y-4">{event.status === 'PASS_ASSIGNED' && event.ratifications.length > 0 ? <div className="rounded-2xl bg-blue-50 p-4"><p className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-950"><Clock3 size={16} />Ratificaciones</p>{event.ratifications.map((item) => <div key={item.type} className="flex justify-between border-t border-blue-100 py-2 text-sm"><span className="text-blue-900/70">{item.type === 'TOTAL' ? 'Total' : 'Parcial'}</span><span className="font-semibold text-blue-950">{item.startTime} – {item.endTime}</span></div>)}</div> : <div className="flex items-center gap-2 text-sm text-slate-600"><Clock3 size={16} />{event.allDay ? 'Todo el día' : `${event.startTime ?? '—'} – ${event.endTime ?? '—'}`}</div>}
      {event.jiraTicket && <p className="flex items-center gap-2 text-sm text-slate-700"><Ticket size={16} className="text-slate-400" />{event.jiraTicket}</p>}{event.note && <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{event.note}</div>}
      <div className="flex flex-wrap gap-2">{event.jiraLink && <><Button variant="outline" onClick={copy}><Copy size={15} />Copiar link</Button><Button variant="outline" onClick={() => window.open(event.jiraLink!, '_blank', 'noopener,noreferrer')}><ExternalLink size={15} />Abrir ticket</Button></>}{isEditor && <Button onClick={onEdit}><CalendarDays size={15} />Editar registro</Button>}</div>
    </div>
  </DialogContent></Dialog>
}
