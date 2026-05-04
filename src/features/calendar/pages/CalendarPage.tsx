import { useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventInput, EventClickArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import { addMonths, subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { regimeRepo, exceptionRepo, noteRepo } from '@/lib/repository'
import { computeSchedule } from '@/lib/schedule/computeSchedule'
import type { CalendarNote, CustodyRegime, ExceptionRequest } from '@/types/domain'
import { Modal } from '@/ui/Modal'
import { Link, useNavigate } from 'react-router-dom'

export function CalendarPage() {
  const { activeFamily, activeFamilyMembers, children } = useAppStore()
  const [regimes, setRegimes] = useState<CustodyRegime[]>([])
  const [exceptions, setExceptions] = useState<ExceptionRequest[]>([])
  const [notes, setNotes] = useState<CalendarNote[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [filterChildId, setFilterChildId] = useState<string>('all')
  const calendarRef = useRef<FullCalendar>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!activeFamily) return
    Promise.all([
      regimeRepo.getRegimes(activeFamily.id),
      exceptionRepo.getExceptions(activeFamily.id),
      noteRepo.getNotes(activeFamily.id),
    ]).then(([r, e, n]) => {
      setRegimes(r)
      setExceptions(e)
      setNotes(n)
    })
  }, [activeFamily])

  function getParentColor(parentId: string) {
    return activeFamilyMembers.find((m) => m.userId === parentId)?.color ?? '#6b7280'
  }

  function getParentName(parentId: string) {
    return activeFamilyMembers.find((m) => m.userId === parentId)?.profile.displayName ?? 'Desconhecido'
  }

  const calendarEvents: EventInput[] = []

  if (regimes.length > 0) {
    const from = subMonths(startOfMonth(new Date()), 1)
    const to = addMonths(endOfMonth(new Date()), 2)

    const filteredRegimes = filterChildId === 'all'
      ? regimes
      : regimes.filter((r) => r.childId === filterChildId)

    const events = computeSchedule({
      regimes: filteredRegimes,
      exceptions,
      from,
      to,
      familyId: activeFamily?.id ?? '',
    })

    for (const ev of events) {
      const child = children.find((c) => c.id === ev.childId)
      const color = ev.isException ? '#8b5cf6' : getParentColor(ev.parentId)

      calendarEvents.push({
        id: ev.id,
        title: ev.isException
          ? `${child?.fullName ?? ''} — ${ev.label ?? 'Excepção'}`
          : `${child?.fullName ?? ''} — ${getParentName(ev.parentId)}`,
        date: ev.eventDate,
        backgroundColor: color,
        borderColor: color,
        textColor: '#fff',
        extendedProps: { event: ev, type: ev.eventType },
        allDay: true,
      })

      if (ev.eventType === 'troca') {
        calendarEvents.push({
          id: ev.id + '-exchange',
          title: '↔ Troca',
          date: ev.eventDate,
          backgroundColor: '#f59e0b',
          borderColor: '#f59e0b',
          textColor: '#fff',
          allDay: true,
        })
      }
    }
  }

  for (const note of notes) {
    if (filterChildId !== 'all' && note.childId && note.childId !== filterChildId) continue
    calendarEvents.push({
      id: `note-${note.id}`,
      title: `📝 ${note.title ?? note.body.slice(0, 20)}`,
      date: note.noteDate,
      backgroundColor: '#10b981',
      borderColor: '#10b981',
      textColor: '#fff',
      allDay: true,
      extendedProps: { type: 'note', note },
    })
  }

  function handleDateClick(arg: DateClickArg) {
    setSelectedDate(arg.dateStr)
    setShowDayModal(true)
  }

  function handleEventClick(arg: EventClickArg) {
    const props = arg.event.extendedProps
    if (props.type === 'note') {
      navigate(`/notes/${(props.note as CalendarNote).id}`)
    } else {
      setSelectedDate(arg.event.startStr.slice(0, 10))
      setShowDayModal(true)
    }
  }

  const notesForSelectedDate = selectedDate
    ? notes.filter((n) => n.noteDate === selectedDate)
    : []

  return (
    <div className="flex flex-col h-full">
      {children.length > 1 && (
        <div className="px-4 pt-3 pb-0 overflow-x-auto">
          <div className="flex gap-2 pb-1">
            <button
              onClick={() => setFilterChildId('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                filterChildId === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Todos
            </button>
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setFilterChildId(child.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors ${
                  filterChildId === child.id ? 'text-white' : 'bg-gray-100 text-gray-600'
                }`}
                style={filterChildId === child.id ? { backgroundColor: child.color } : {}}
              >
                {child.fullName}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-2 pb-1 flex gap-3 flex-wrap">
        {activeFamilyMembers.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-xs text-gray-600">{m.profile.displayName}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-purple-500" />
          <span className="text-xs text-gray-600">Excepção</span>
        </div>
      </div>

      <div className="flex-1 px-2 pb-2 overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
          footerToolbar={{ center: 'dayGridMonth,listWeek' }}
          locale="pt"
          firstDay={1}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEvents={2}
          eventDisplay="block"
          buttonText={{ dayGridMonth: 'Mês', listWeek: 'Lista' }}
        />
      </div>

      <Modal
        open={showDayModal}
        onClose={() => { setShowDayModal(false); setSelectedDate(null) }}
        title={selectedDate ? format(new Date(selectedDate + 'T12:00:00'), 'dd/MM/yyyy') : 'Detalhes'}
      >
        <div className="flex flex-col gap-3">
          {notesForSelectedDate.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notas</p>
              {notesForSelectedDate.map((note) => (
                <div key={note.id} className="p-2 bg-green-50 rounded-lg text-sm text-gray-800 mb-1">
                  {note.title && <strong>{note.title} · </strong>}
                  {note.body}
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Link
              to={selectedDate ? `/notes/new?date=${selectedDate}` : '/notes/new'}
              className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-sm text-green-700 font-medium hover:bg-green-100 transition-colors"
              onClick={() => setShowDayModal(false)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar nota
            </Link>
            <Link
              to={selectedDate ? `/exceptions/new?date=${selectedDate}` : '/exceptions/new'}
              className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-sm text-amber-700 font-medium hover:bg-amber-100 transition-colors"
              onClick={() => setShowDayModal(false)}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Pedir alteração
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  )
}
