import { useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import esLocale from '@fullcalendar/core/locales/es'
import type { CalendarApi, DateSelectArg, EventClickArg, EventInput as FcEventInput } from '@fullcalendar/core'
import { ChevronLeft, ChevronRight, Plus, CalendarDays, ListFilter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CalendarEvent } from '@/types/calendar'
import { STATUS_META } from '@/types/calendar'
import { dateToIso } from '@/utils/validators'

interface Props { events: CalendarEvent[]; isEditor: boolean; onCreate: (start: string, end?: string) => void; onOpenEvent: (event: CalendarEvent) => void }
export function QECalendar({ events, isEditor, onCreate, onOpenEvent }: Props) {
  const ref = useRef<FullCalendar>(null)
  const api = (): CalendarApi | undefined => ref.current?.getApi()
  const fcEvents: FcEventInput[] = events.map((event) => {
    const schedule = event.status === 'PASS_ASSIGNED' ? event.ratifications.map((item) => `${item.type === 'TOTAL' ? 'Total' : 'Parcial'} ${item.startTime}`).join(' · ') : ''
    return {
      id: event.id, title: event.status === 'PASS_ASSIGNED' ? (event.passName || event.jiraTicket || 'Pase') : STATUS_META[event.status].label,
      start: event.allDay ? event.eventDate : `${event.eventDate}T${event.status === 'PASS_ASSIGNED' ? event.ratifications[0]?.startTime ?? '09:00' : event.startTime ?? '09:00'}`,
      end: event.allDay ? undefined : `${event.eventDate}T${event.status === 'PASS_ASSIGNED' ? event.ratifications[0]?.endTime ?? '09:30' : event.endTime ?? '10:00'}`,
      allDay: event.allDay, backgroundColor: `${STATUS_META[event.status].color}18`, borderColor: `${STATUS_META[event.status].color}42`, textColor: STATUS_META[event.status].color,
      extendedProps: { event, schedule },
    }
  })
  function selectDate(arg: DateSelectArg) { onCreate(arg.startStr.slice(0, 10), arg.endStr ? new Date(new Date(arg.endStr).getTime() - 86400000).toISOString().slice(0, 10) : undefined) }
  function clickDate(arg: { dateStr: string }) { if (isEditor) onCreate(arg.dateStr.slice(0, 10)) }
  function clickEvent(arg: EventClickArg) { onOpenEvent(arg.event.extendedProps.event as CalendarEvent) }
  function changeView(view: string) { api()?.changeView(view) }
  return <section className="calendar-shell flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-[#e4e9f1] bg-white shadow-[0_5px_24px_rgba(19,44,82,.045)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6"><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Mes anterior" onClick={() => api()?.prev()}><ChevronLeft size={17} /></Button><Button variant="outline" className="h-10 px-3" onClick={() => api()?.today()}>Hoy</Button><Button variant="outline" size="icon" aria-label="Mes siguiente" onClick={() => api()?.next()}><ChevronRight size={17} /></Button><h2 className="ml-2 text-lg font-bold capitalize tracking-tight text-[#12294d] sm:ml-4 sm:text-xl" id="calendar-title">{new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(api()?.getDate() ?? new Date())}</h2></div><div className="flex items-center gap-2">{isEditor && <Button size="sm" onClick={() => onCreate(dateToIso(new Date()))}><Plus size={16} /><span className="hidden sm:inline">Nuevo registro</span></Button>}<div className="hidden rounded-xl bg-[#f3f5f8] p-1 sm:flex"><button className="view-switch" onClick={() => changeView('dayGridMonth')}><CalendarDays size={14} />Mes</button><button className="view-switch" onClick={() => changeView('timeGridWeek')}>Semana</button><button className="view-switch" onClick={() => changeView('timeGridDay')}>Día</button></div><select className="field-input !h-9 !w-28 !px-2 text-xs sm:hidden" aria-label="Vista del calendario" defaultValue="dayGridMonth" onChange={(e) => changeView(e.target.value)}><option value="dayGridMonth">Mes</option><option value="timeGridWeek">Semana</option><option value="timeGridDay">Día</option></select><button className="hidden h-9 w-9 items-center justify-center rounded-xl bg-[#f3f5f8] text-slate-600" aria-label="Vista de lista" onClick={() => changeView('listWeek')}><ListFilter size={16} /></button></div></div>
    <div className="min-h-0 flex-1 p-2 sm:p-4"><FullCalendar ref={ref} plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]} locale={esLocale} initialView="dayGridMonth" headerToolbar={false} height="100%" events={fcEvents} selectable={isEditor} selectMirror={isEditor} dayMaxEvents={3} weekends={true} firstDay={1} nowIndicator eventClick={clickEvent} dateClick={clickDate} select={selectDate} datesSet={() => { const el = document.getElementById('calendar-title'); if (el && api()) el.textContent = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(api()!.getDate()) }} eventContent={(arg) => <div className="fc-event-inner"><span className="fc-event-dot" style={{ backgroundColor: arg.event.textColor }} /><span className="fc-event-label">{arg.event.title}</span>{arg.event.extendedProps.schedule && <span className="fc-event-time">{arg.event.extendedProps.schedule}</span>}</div>} /></div>
    <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">{isEditor ? 'Selecciona un día o arrastra para registrar disponibilidad en varias fechas.' : 'Selecciona un evento para consultar sus detalles.'}</div>
  </section>
}
