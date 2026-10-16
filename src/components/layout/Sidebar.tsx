import { BookOpen, CalendarClock, CheckSquare, ChevronRight, ExternalLink, Ticket, Timer, Users } from 'lucide-react'
import { EXTERNAL_LINKS, OWNER } from '@/config'
import { STATUS_META } from '@/types/calendar'
import type { CalendarStatus } from '@/types/calendar'

export type ActiveTab = 'calendar' | 'reports' | 'ratifications'
interface Props { onNextPass: () => void; onNavigate: (tab: ActiveTab) => void }
const legend: { status: CalendarStatus; label: string }[] = [
  { status: 'PASS_ASSIGNED', label: 'Pase asignado' },
  { status: 'PENDING', label: 'Por confirmar' },
  { status: 'UNAVAILABLE', label: 'No disponible / restricción' },
  { status: 'PASS_CANCELLED', label: 'Pase cancelado' },
]

const rowClass = 'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs text-blue-50/90 hover:bg-white/10'
const external = [
  { label: 'Squad QE', icon: Users, url: EXTERNAL_LINKS.squad },
  { label: 'Documentación', icon: BookOpen, url: EXTERNAL_LINKS.docs },
]

export function Sidebar({ onNextPass, onNavigate }: Props) {
  const quick = [
    { label: 'Próximo pase', icon: CalendarClock, action: onNextPass },
    { label: 'Resumen de horas', icon: Timer, action: () => onNavigate('reports') },
    { label: 'Ratificaciones', icon: CheckSquare, action: () => onNavigate('ratifications') },
  ]
  return <aside className="flex h-full flex-col gap-6 rounded-2xl bg-gradient-to-b from-[#0d2547] to-[#0a1d38] p-4 text-white shadow-[0_8px_30px_rgba(10,29,56,.25)]">
    <div className="flex items-center gap-3 rounded-xl bg-white/[.07] p-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-sm font-bold">{OWNER.initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{OWNER.name}</p><p className="truncate text-xs text-blue-200/70">{OWNER.role}</p></div></div>
    <div><p className="mb-3 text-xs font-bold text-blue-100">Leyenda del calendario</p><ul className="space-y-2.5">
      {legend.map(({ status, label }) => <li key={status} className="flex items-center gap-2.5 text-xs text-blue-50/90"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: STATUS_META[status].color }} />{label}</li>)}
      <li className="flex items-center gap-2.5 text-xs text-blue-50/90"><span className="h-3 w-3 shrink-0 rounded-full border border-blue-200/60" />Sin marca = sin registro</li>
    </ul></div>
    <div><p className="mb-3 text-xs font-bold text-blue-100">Accesos rápidos</p><ul className="space-y-1">
      {quick.map(({ label, icon: Icon, action }) => <li key={label}><button type="button" onClick={action} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs text-blue-50/90 hover:bg-white/10"><Icon size={15} className="text-blue-200/80" /><span className="flex-1">{label}</span><ChevronRight size={14} className="text-blue-200/50" /></button></li>)}
    </ul></div>
    <div><p className="mb-3 text-xs font-bold text-blue-100">Accesos</p><ul className="space-y-1">
      <li><button type="button" onClick={() => onNavigate('ratifications')} className={rowClass}><Ticket size={15} className="text-blue-200/80" /><span className="flex-1">Ver mis pases</span><ChevronRight size={14} className="text-blue-200/50" /></button></li>
      {external.map(({ label, icon: Icon, url }) => <li key={label}>{url
        ? <a href={url} target="_blank" rel="noopener noreferrer" className={rowClass}><Icon size={15} className="text-blue-200/80" /><span className="flex-1">{label}</span><ExternalLink size={13} className="text-blue-200/50" /></a>
        : <button type="button" disabled title="Enlace pendiente de configurar" className={`${rowClass} cursor-not-allowed opacity-50 hover:bg-transparent`}><Icon size={15} className="text-blue-200/80" /><span className="flex-1">{label}</span><ExternalLink size={13} className="text-blue-200/50" /></button>}</li>)}
    </ul></div>
  </aside>
}
