import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, ChartNoAxesCombined, Eye, LogOut, Menu, ShieldCheck, Sparkles, CheckSquare } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { verifyEditor, signOut, getSession } from '@/services/auth.service'
import { getEvents } from '@/services/events.service'
import { CalendarLegend } from '@/components/calendar/CalendarLegend'
import { QECalendar } from '@/components/calendar/QECalendar'
import { EditorLoginDialog } from '@/components/auth/EditorLoginDialog'
import { EventForm } from '@/components/events/EventForm'
import { EventDetails } from '@/components/events/EventDetails'
import { ReportsPage } from '@/components/reports/ReportsPage'
import { RatificationsPage } from '@/components/reports/RatificationsPage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { CalendarEvent } from '@/types/calendar'
import { dateToIso } from '@/utils/validators'

type ActiveTab = 'calendar' | 'reports' | 'ratifications'
export default function App() {
  const [isEditor, setIsEditor] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar')
  const [loginOpen, setLoginOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formDate, setFormDate] = useState(dateToIso(new Date()))
  const [formEndDate, setFormEndDate] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try { const list = await getEvents(); setEvents(list); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los eventos.') }
    finally { setLoading(false) }
  }, [])

  const syncSession = useCallback(async (next: Session | null) => {
    if (!next) { setIsEditor(false); return }
    setIsEditor(await verifyEditor(next))
  }, [])

  useEffect(() => {
    let alive = true
    void getSession().then(async (current) => { if (alive) await syncSession(current) }).catch(() => { if (alive) setIsEditor(false) })
    const subscription = supabase?.auth.onAuthStateChange((_event, next) => { void syncSession(next) }).data.subscription
    void refresh()
    return () => { alive = false; subscription?.unsubscribe() }
  }, [refresh, syncSession])

  function create(start: string, end?: string) { setFormDate(start); setFormEndDate(end); setSelectedEvent(null); setFormOpen(true) }
  function openEvent(event: CalendarEvent) { setSelectedEvent(event); setDetailOpen(true) }
  function editSelected() { setDetailOpen(false); setFormDate(selectedEvent?.eventDate ?? dateToIso(new Date())); setFormEndDate(undefined); setFormOpen(true) }
  async function logout() { try { await signOut() } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cerrar sesión.') } }
  function onSaved() { void refresh() }

  return <div className="min-h-screen bg-[#f5f7fb] text-[#132949]">
    <header className="sticky top-0 z-30 border-b border-[#e5eaf1] bg-white/90 backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-[1800px] items-center justify-between px-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#347df5] to-[#145bd8] text-white shadow-[0_5px_12px_rgba(35,104,222,.22)]"><CalendarDays size={21} /></div><div className="min-w-0"><h1 className="truncate text-base font-bold tracking-tight text-[#11264a] sm:text-lg">Calendario de disponibilidad QE</h1><p className="hidden text-[11px] font-medium tracking-wide text-slate-400 sm:block">QUALITY ENGINEERING · OPERACIONES</p></div></div><div className="flex items-center gap-2 sm:gap-3">{isEditor ? <><span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:flex"><ShieldCheck size={14} />Modo editor</span><Button variant="ghost" size="sm" onClick={logout}><LogOut size={15} /><span className="hidden sm:inline">Cerrar sesión</span></Button></> : <><span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 sm:flex"><Eye size={14} />Solo lectura</span><Button variant="outline" size="sm" onClick={() => setLoginOpen(true)}>¿Eres editor?</Button></>}</div></div></header>
    <main className="mx-auto max-w-[1800px] px-3 py-5 sm:px-5 sm:py-7 lg:px-8"><div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-blue-600"><Sparkles size={14} />Planificación QE</div><h2 className="text-2xl font-bold tracking-tight text-[#11264a] sm:text-[28px]">Disponibilidad del equipo</h2><p className="mt-1.5 text-sm text-slate-500">Coordina horarios, restricciones y pases en un solo lugar.</p></div><div className="flex w-fit items-center gap-1 rounded-xl border border-[#e5eaf1] bg-white p-1 shadow-sm"><button onClick={() => setActiveTab('calendar')} className={`tab-button ${activeTab === 'calendar' ? 'tab-button-active' : ''}`}><CalendarDays size={15} />Calendario</button><button onClick={() => setActiveTab('reports')} className={`tab-button ${activeTab === 'reports' ? 'tab-button-active' : ''}`}><ChartNoAxesCombined size={15} />Estadísticas</button><button onClick={() => setActiveTab('ratifications')} className={`tab-button ${activeTab === 'ratifications' ? 'tab-button-active' : ''}`}><CheckSquare size={15} />Ratificaciones</button></div></div>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}{isSupabaseConfigured ? '' : ' — Puedes continuar usando la vista de demostración.'}</div>}
      {!isSupabaseConfigured && <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900"><strong>Modo demostración:</strong> configura las credenciales de Supabase en `.env` para habilitar autenticación, sincronización y permisos de edición.</div>}
      {activeTab === 'calendar' ? <div className="grid items-stretch gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[255px_minmax(0,1fr)]"><div className="hidden rounded-2xl border border-[#e5eaf1] bg-white lg:block"><CalendarLegend isEditor={isEditor} onLogin={() => setLoginOpen(true)} /></div><div className="min-w-0">{loading ? <div className="flex min-h-[620px] items-center justify-center rounded-2xl border border-[#e5eaf1] bg-white text-sm text-slate-400">Cargando calendario…</div> : <QECalendar events={events} isEditor={isEditor} onCreate={create} onOpenEvent={openEvent} />}</div></div> : activeTab === 'reports' ? <ReportsPage events={events} /> : <RatificationsPage />}
    </main>
    <footer className="mx-auto flex max-w-[1800px] items-center justify-between border-t border-[#e7ebf1] px-4 py-5 text-xs text-slate-400 sm:px-6 lg:px-8"><span>Calendario de disponibilidad QE</span><span>Información operativa para coordinación</span></footer>
    <EditorLoginDialog open={loginOpen} onOpenChange={setLoginOpen} onSignedIn={() => { void getSession().then(syncSession); void refresh() }} />
    <EventForm key={`${selectedEvent?.id ?? 'new'}-${formDate}-${formEndDate ?? ''}`} open={formOpen} onOpenChange={setFormOpen} initialDate={formDate} endDate={formEndDate} event={selectedEvent} onSaved={onSaved} />
    <EventDetails event={selectedEvent} open={detailOpen} onOpenChange={setDetailOpen} isEditor={isEditor} onEdit={editSelected} />
    <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}><DialogContent className="left-0 top-0 h-full max-h-full w-[min(88vw,360px)] max-w-none translate-x-0 translate-y-0 rounded-none rounded-r-3xl p-0"><DialogTitle className="sr-only">Leyenda del calendario</DialogTitle><CalendarLegend isEditor={isEditor} onLogin={() => { setMobileNavOpen(false); setLoginOpen(true) }} /></DialogContent></Dialog>
  </div>
}
