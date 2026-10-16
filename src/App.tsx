import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { verifyEditor, signOut, getSession } from '@/services/auth.service'
import { deleteEvent, eventToInput, getApplicationCodes, getEvents, saveEvent } from '@/services/events.service'
import { AppHeader } from '@/components/layout/AppHeader'
import { Sidebar, type ActiveTab } from '@/components/layout/Sidebar'
import { QECalendar, type CalendarFocus } from '@/components/calendar/QECalendar'
import { CalendarSidePanel } from '@/components/calendar/CalendarSidePanel'
import { EditorLoginDialog } from '@/components/auth/EditorLoginDialog'
import { EventForm } from '@/components/events/EventForm'
import { ReportsPage } from '@/components/reports/ReportsPage'
import { RatificationsPage } from '@/components/reports/RatificationsPage'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { CalendarEvent, CalendarStatus } from '@/types/calendar'
import { dateToIso } from '@/utils/validators'
import { monthOf, nextPass as findNextPass, summarize, toRatificationRecords } from '@/utils/hours'

export default function App() {
  const [isEditor, setIsEditor] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [applications, setApplications] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('calendar')
  const [loginOpen, setLoginOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formDate, setFormDate] = useState(dateToIso(new Date()))
  const [formEndDate, setFormEndDate] = useState<string | undefined>()
  const [formEvent, setFormEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState(dateToIso(new Date()))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(dateToIso(new Date()).slice(0, 7))
  const [focus, setFocus] = useState<CalendarFocus | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const initialSelection = useRef(false)

  const refresh = useCallback(async () => {
    try { const list = await getEvents(); setEvents(list); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los eventos.') }
    finally { setLoading(false) }
    void getApplicationCodes().then(setApplications).catch(() => undefined)
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

  const today = dateToIso(new Date())
  const nextPass = useMemo(() => findNextPass(events, today), [events, today])
  const records = useMemo(() => toRatificationRecords(events), [events])
  const pendingCount = records.filter((item) => item.status !== 'COMPLETED').length
  const monthHours = useMemo(() => summarize(records.filter((item) => monthOf(item.eventDate) === calendarMonth)), [records, calendarMonth])
  const dayEvents = useMemo(() => events.filter((event) => event.eventDate === selectedDate).sort((a, b) => (a.startTime ?? a.ratifications[0]?.startTime ?? '').localeCompare(b.startTime ?? b.ratifications[0]?.startTime ?? '')), [events, selectedDate])
  const selectedEvent = dayEvents.find((event) => event.id === selectedId) ?? (dayEvents.length === 1 ? dayEvents[0] : null)

  useEffect(() => {
    if (loading || initialSelection.current) return
    initialSelection.current = true
    if (nextPass) { setSelectedDate(nextPass.eventDate); setSelectedId(nextPass.id) }
  }, [loading, nextPass])

  function selectEvent(event: CalendarEvent) { setSelectedDate(event.eventDate); setSelectedId(event.id) }
  function selectDate(date: string) { setSelectedDate(date); setSelectedId(null) }
  function showEvent(event: CalendarEvent) { selectEvent(event); setActiveTab('calendar'); setCalendarMonth(monthOf(event.eventDate)); setFocus({ date: event.eventDate, nonce: Date.now() }) }
  function goNextPass() { setActiveTab('calendar'); setMobileNavOpen(false); if (nextPass) showEvent(nextPass) }
  function navigate(tab: ActiveTab) { setActiveTab(tab); setMobileNavOpen(false) }
  function openForm(event: CalendarEvent | null, start: string, end?: string) { setNotice(''); setFormEvent(event); setFormDate(start); setFormEndDate(end); setFormOpen(true) }
  async function logout() { try { await signOut() } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cerrar sesión.') } }
  function changed(message?: string) { if (message) setNotice(message); void refresh() }
  async function changeStatus(event: CalendarEvent, status: CalendarStatus) { await saveEvent(eventToInput(event, { status })); changed(); }
  async function removeEvent(event: CalendarEvent) { await deleteEvent(event.id); setSelectedId(null); changed('Registro eliminado correctamente.') }

  const sidebar = <Sidebar onNextPass={goNextPass} onNavigate={navigate} />
  return <div className="min-h-screen bg-[#f5f7fb] text-[#132949]">
    <AppHeader isEditor={isEditor} activeTab={activeTab} pendingCount={pendingCount} onTab={navigate} onLogin={() => setLoginOpen(true)} onLogout={() => void logout()} onMenu={() => setMobileNavOpen(true)} onHelp={() => setHelpOpen(true)} />
    <div className="mx-auto grid max-w-[1800px] gap-4 px-3 py-4 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-8">
      <div className="hidden lg:block"><div className="sticky top-20">{sidebar}</div></div>
      <main className="min-w-0">
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}{isSupabaseConfigured ? '' : ' — Puedes continuar usando la vista de demostración.'}</div>}
        {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}<button type="button" className="ml-3 font-semibold underline" onClick={() => setNotice('')}>Cerrar</button></div>}
        {!isSupabaseConfigured && <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900"><strong>Modo demostración:</strong> configura las credenciales de Supabase en `.env` para habilitar autenticación, sincronización y permisos de edición.</div>}
        {activeTab === 'calendar' && <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="min-w-0">{loading ? <div className="flex min-h-[620px] items-center justify-center rounded-2xl border border-[#e5eaf1] bg-white text-sm text-slate-400">Cargando calendario…</div>
            : <QECalendar events={events} isEditor={isEditor} selectedDate={selectedDate} focus={focus} initialMonth={calendarMonth} onSelectDate={selectDate} onSelectEvent={selectEvent} onCreateRange={(start, end) => openForm(null, start, end)} onMonthChange={setCalendarMonth} />}</div>
          <CalendarSidePanel isEditor={isEditor} dayEvents={dayEvents} selectedDate={selectedDate} selectedEvent={selectedEvent} nextPass={nextPass} hours={monthHours} month={calendarMonth}
            onSelectEvent={selectEvent} onNew={() => openForm(null, selectedDate)} onEdit={(event) => openForm(event, event.eventDate)} onChangeStatus={changeStatus} onDelete={removeEvent} onSeeAll={() => navigate('ratifications')} />
        </div>}
        {activeTab === 'reports' && <ReportsPage events={events} isEditor={isEditor} applications={applications} />}
        {activeTab === 'ratifications' && <RatificationsPage events={events} isEditor={isEditor} applications={applications} onNew={() => openForm(null, today)} onViewEvent={showEvent} onEditEvent={(event) => openForm(event, event.eventDate)} onChanged={changed} />}
      </main>
    </div>
    <EditorLoginDialog open={loginOpen} onOpenChange={setLoginOpen} onSignedIn={() => { void getSession().then(syncSession); void refresh() }} />
    <EventForm key={`${formEvent?.id ?? 'new'}-${formDate}-${formEndDate ?? ''}-${formOpen}`} open={formOpen} onOpenChange={setFormOpen} initialDate={formDate} endDate={formEndDate} event={formEvent} onSaved={() => changed()} />
    <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}><DialogContent className="left-0 top-0 h-full max-h-full w-[min(88vw,320px)] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none rounded-r-3xl p-3"><DialogTitle className="sr-only">Menú</DialogTitle>{sidebar}</DialogContent></Dialog>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent><DialogTitle className="text-lg font-bold text-[#11264a]">Cómo usar la plataforma</DialogTitle><DialogDescription className="mt-2 space-y-2 text-sm leading-6 text-slate-600"><span className="block">Estás en <strong>modo lectura</strong>: puedes consultar el calendario, las estadísticas y las ratificaciones.</span><span className="block">Selecciona un día o un evento para ver su detalle. La editora puede iniciar sesión desde el botón “Modo lectura” para registrar y modificar pases.</span></DialogDescription></DialogContent></Dialog>
  </div>
}
