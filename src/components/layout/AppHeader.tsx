import { useState } from 'react'
import { Bell, CalendarDays, ChartNoAxesCombined, CheckSquare, CircleHelp, Eye, LogOut, Menu, ShieldCheck, UserRound } from 'lucide-react'
import { OWNER } from '@/config'
import type { ActiveTab } from '@/components/layout/Sidebar'

interface Props {
  isEditor: boolean; activeTab: ActiveTab; pendingCount: number
  onTab: (tab: ActiveTab) => void; onLogin: () => void; onLogout: () => void; onMenu: () => void; onHelp: () => void
}
const tabs: { id: ActiveTab; label: string; icon: typeof CalendarDays }[] = [
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'reports', label: 'Estadísticas', icon: ChartNoAxesCombined },
  { id: 'ratifications', label: 'Ratificaciones', icon: CheckSquare },
]

export function AppHeader({ isEditor, activeTab, pendingCount, onTab, onLogin, onLogout, onMenu, onHelp }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <header className="sticky top-0 z-30 border-b border-[#e5eaf1] bg-white/95 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-3 sm:px-6 lg:px-8">
      <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú" onClick={onMenu}><Menu size={19} /></button>
      <div className="flex min-w-0 items-center gap-2.5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#347df5] to-[#145bd8] text-white"><CalendarDays size={19} /></div><h1 className="hidden truncate text-sm font-bold text-[#11264a] md:block">Plataforma de control de pases QE</h1></div>
      <nav className="mx-auto flex items-center gap-1 rounded-xl bg-[#f3f5f8] p-1" aria-label="Secciones">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => onTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`tab-button ${activeTab === id ? 'tab-button-active' : ''}`}><Icon size={15} /><span className="hidden sm:inline">{label}</span></button>)}
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        {isEditor
          ? <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex"><ShieldCheck size={14} />Modo editor</span>
          : <button onClick={onLogin} className="hidden items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 sm:flex" title="Iniciar sesión como editora"><Eye size={14} />Modo lectura</button>}
        {isEditor
          ? <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label={`Ratificaciones por atender: ${pendingCount}`} onClick={() => onTab('ratifications')}><Bell size={18} />{pendingCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{pendingCount}</span>}</button>
          : <button className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Ayuda" onClick={onHelp}><CircleHelp size={18} /></button>}
        <div className="relative">
          <button onClick={() => setMenuOpen((open) => !open)} aria-label="Cuenta" aria-expanded={menuOpen} className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-xs font-bold text-white">{OWNER.initials}</button>
          {menuOpen && <><button className="fixed inset-0 z-40 cursor-default" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} /><div className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-[#e5eaf1] bg-white p-1.5 shadow-lg">
            <p className="px-3 py-2 text-xs text-slate-500">{isEditor ? 'Sesión de editora' : 'Solo lectura'}</p>
            {isEditor
              ? <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setMenuOpen(false); onLogout() }}><LogOut size={15} />Cerrar sesión</button>
              : <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => { setMenuOpen(false); onLogin() }}><UserRound size={15} />Acceso de editora</button>}
          </div></>}
        </div>
      </div>
    </div>
  </header>
}
