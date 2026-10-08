import { Eye, ShieldCheck } from 'lucide-react'
import { STATUS_META } from '@/types/calendar'
import type { CalendarStatus } from '@/types/calendar'

interface Props { isEditor: boolean; onLogin: () => void }
export function CalendarLegend({ isEditor, onLogin }: Props) {
  return <aside className="flex h-full flex-col gap-7 p-5 lg:p-6">
    <div><p className="eyebrow mb-4">Estado de disponibilidad</p><div className="space-y-4">{(Object.keys(STATUS_META) as CalendarStatus[]).filter((status) => status !== 'AVAILABLE').map((status) => <div className="flex items-start gap-3" key={status}><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: STATUS_META[status].color, boxShadow: `0 0 0 4px ${STATUS_META[status].color}18` }} /><div><p className="text-sm font-semibold text-[#1a2d4d]">{STATUS_META[status].label}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{STATUS_META[status].description}</p></div></div>)}</div></div>
    <div className="mt-auto rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50/60 p-4"><div className="flex gap-2.5"><Eye className="mt-0.5 shrink-0 text-blue-600" size={17} /><div><p className="text-xs leading-5 text-blue-900/75">Modo visualización solo lectura</p></div></div></div>
    <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">{isEditor ? <><ShieldCheck className="text-emerald-600" size={16} />Sesión de editora autorizada</> : <><Eye className="text-slate-400" size={16} />Vista de solo lectura<button className="ml-auto font-semibold text-blue-600 hover:text-blue-800" onClick={onLogin}>¿Eres editor?</button></>}</div>
  </aside>
}
