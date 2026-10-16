import { useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import esLocale from '@fullcalendar/core/locales/es'
import type { CalendarApi, DateSelectArg, DatesSetArg, EventClickArg, EventInput as FcEventInput } from '@fullcalendar/core'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CalendarEvent } from '@/types/calendar'
import { FINISHED_COLOR, STATUS_META, isPassStatus } from '@/types/calendar'
import { dateToIso } from '@/utils/validators'
import { monthLabel, primaryWindow } from '@/utils/hours'

export interface CalendarFocus { date: string; nonce: number }
interface Props {
  events: CalendarEvent[]; isEditor: boolean; selectedDate: string; focus?: CalendarFocus; initialMonth: string
  onSelectDate: (date: string) => void; onSelectEvent: (event: CalendarEvent) => void
  onCreateRange: (start: string, end: string) => void; onMonthChange: (month: string) => void
}
const views = [{ id: 'dayGridMonth', label: 'Mes' }, { id: 'timeGridWeek', label: 'Semana' }, { id: 'timeGridDay', label: 'Día' }]

export function QECalendar({ events, isEditor, selectedDate, focus, initialMonth, onSelectDate, onSelectEvent, onCreateRange, onMonthChange }: Props) {
  const ref = useRef<FullCalendar>(null)
  const [title, setTitle] = useState('')
  const [view, setView] = useState('dayGridMonth')
  const api = (): CalendarApi | undefined => ref.current?.getApi()

  const mounted = useRef(false)
  // The first run is covered by initialDate; later runs are "go to this event" requests.
  useEffect(() => { if (mounted.current && focus) api()?.gotoDate(focus.date); mounted.current = true }, [focus])

  const fcEvents: FcEventInput[] = events.map((event) => {
    const window = primaryWindow(event)
    const meta = STATUS_META[event.status]
    const color = event.isFinished ? FINISHED_COLOR : meta.color
    const base = isPassStatus(event.status) ? (event.passName || event.jiraTicket || 'Pase') : event.status === 'PENDING' && event.passName ? `${meta.label} · ${event.passName}` : meta.label
    const time = event.allDay ? 'Todo el día' : window ? `${window.start} - ${window.end}` : ''
    return {
      id: event.id, title: event.isFinished ? `✓ ${base}` : base,
      start: event.allDay || !window ? event.eventDate : `${event.eventDate}T${window.start}`,
      end: event.allDay || !window ? undefined : `${event.eventDate}T${window.end}`,
      allDay: event.allDay || !window, backgroundColor: `${color}1c`, borderColor: `${color}55`, textColor: color,
      extendedProps: { event, time, app: event.appCode },
    }
  })
  function selectRange(arg: DateSelectArg) {
    const start = arg.startStr.slice(0, 10)
    const last = new Date(new Date(`${arg.endStr.slice(0, 10)}T12:00:00`).getTime() - 86400000)
    const end = dateToIso(last)
    if (isEditor && end > start) onCreateRange(start, end)
  }
  function onDatesSet(arg: DatesSetArg) {
    setView(arg.view.type)
    const current = api()?.getDate() ?? arg.view.currentStart
    setTitle(monthLabel(dateToIso(current).slice(0, 7)))
    onMonthChange(dateToIso(current).slice(0, 7))
  }
  return <section className="calendar-shell flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-[#e4e9f1] bg-white shadow-[0_5px_24px_rgba(19,44,82,.045)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
      <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => api()?.today()}>Hoy</Button><Button variant="outline" size="icon" className="h-9 w-9" aria-label="Anterior" onClick={() => api()?.prev()}><ChevronLeft size={16} /></Button><Button variant="outline" size="icon" className="h-9 w-9" aria-label="Siguiente" onClick={() => api()?.next()}><ChevronRight size={16} /></Button><h2 className="ml-2 text-base font-bold tracking-tight text-[#12294d] sm:text-lg">{title}</h2></div>
      <div className="flex rounded-xl bg-[#f3f5f8] p-1">{views.map(({ id, label }) => <button key={id} className={`view-switch ${view === id ? 'view-switch-active' : ''}`} onClick={() => api()?.changeView(id)}>{label}</button>)}</div>
    </div>
    <div className="min-h-0 flex-1 p-2 sm:p-4"><FullCalendar ref={ref} plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]} locale={esLocale} initialView="dayGridMonth" initialDate={`${initialMonth}-01`} headerToolbar={false} height="auto" events={fcEvents} selectable={isEditor} selectMirror={isEditor} dayMaxEvents={3} eventDisplay="block" weekends firstDay={1} nowIndicator
      dayCellClassNames={(arg) => dateToIso(arg.date) === selectedDate ? ['day-selected'] : []}
      eventClick={(arg: EventClickArg) => onSelectEvent(arg.event.extendedProps.event as CalendarEvent)}
      dateClick={(arg) => onSelectDate(arg.dateStr.slice(0, 10))} select={selectRange} datesSet={onDatesSet}
      eventContent={(arg) => <div className="fc-event-inner"><span className="fc-event-label">{arg.event.title}</span>{arg.event.extendedProps.time && <span className="fc-event-time">{arg.event.extendedProps.time}</span>}{arg.event.extendedProps.app && <span className="fc-event-time">{arg.event.extendedProps.app}</span>}</div>} /></div>
    <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">{isEditor ? 'Selecciona un día para ver su detalle, o arrastra varios días para registrarlos juntos.' : 'Selecciona un día o un evento para consultar sus detalles.'}</div>
  </section>
}
