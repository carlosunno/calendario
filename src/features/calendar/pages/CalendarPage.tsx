import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventInput, EventClickArg } from '@fullcalendar/core'
import type { DateClickArg } from '@fullcalendar/interaction'
import { addMonths, subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { regimeRepo, exceptionRepo, noteRepo } from '@/lib/repository'
import { computeSchedule, getParentForDate } from '@/lib/schedule/computeSchedule'
import { getPortugueseHolidays } from '@/lib/holidays/pt'
import type { CalendarNote, CustodyRegime, ExceptionRequest } from '@/types/domain'
import { Modal } from '@/ui/Modal'
import { Link, useNavigate } from 'react-router-dom'

function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

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

  const holidays = useMemo(() => {
    const year = new Date().getFullYear()
    return [...getPortugueseHolidays(year), ...getPortugueseHolidays(year + 1)]
  }, [])

  const calendarEvents: EventInput[] = []

  // Background + label events for holidays
  for (const h of holidays) {
    calendarEvents.push({
      id: `holiday-bg-${h.date}`,
      date: h.date,
      display: 'background',
      backgroundColor: 'rgba(220,38,38,0.08)',
      allDay: true,
    })
    calendarEvents.push({
      id: `holiday-label-${h.date}`,
      title: `🎉 ${h.name}`,
      date: h.date,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: '#dc2626',
      allDay: true,
      extendedProps: { type: 'feriado', holiday: h },
      classNames: ['fc-holiday-label'],
    })
  }

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
      // Skip troca marker — custody background already shows the handover day
      if (ev.eventType === 'troca') continue

      const color = ev.isException ? '#8b5cf6' : getParentColor(ev.parentId)
      const parentName = ev.isException ? (ev.label ?? 'Excepção') : getParentName(ev.parentId)
      const child = children.find((c) => c.id === ev.childId)
      const childFirst = child?.fullName.split(' ')[0] ?? ''
      const initial = parentName.charAt(0).toUpperCase()

      // Full-day background tint
      calendarEvents.push({
        id: ev.id + '-bg',
        date: ev.eventDate,
        display: 'background',
        backgroundColor: hexToRgba(color, 0.18),
        allDay: true,
      })

      // Foreground label
      calendarEvents.push({
        id: ev.id,
        title: children.length > 1
          ? `${initial} ${parentName} · ${childFirst}`
          : `${initial} ${parentName}`,
        date: ev.eventDate,
        backgroundColor: color,
        borderColor: color,
        textColor: '#fff',
        extendedProps: { event: ev, type: ev.eventType },
        allDay: true,
      })
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

  const custodyForSelectedDate = selectedDate
    ? (() => {
        const date = new Date(selectedDate + 'T12:00:00')
        const filteredRegimes = filterChildId === 'all'
          ? regimes
          : regimes.filter((r) => r.childId === filterChildId)
        return children
          .filter((c) => filterChildId === 'all' || c.id === filterChildId)
          .map((child) => {
            const childRegimes = filteredRegimes.filter((r) => r.childId === child.id)
            const parentId = getParentForDate(date, childRegimes, child.id, exceptions)
            return parentId ? { child, parentId } : null
          })
          .filter(Boolean) as Array<{ child: typeof children[0]; parentId: string }>
      })()
    : []

  const holidayOnSelectedDate = selectedDate
    ? holidays.find((h) => h.date === selectedDate)
    : null

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

      <div className="px-4 pt-2 pb-1 flex gap-3 flex-wrap items-center">
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
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-600" />
          <span className="text-xs text-gray-600">Feriado</span>
        </div>
      </div>

      <div className="flex-1 px-2 pb-2 overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
          footerToolbar={{ center: 'dayGridMonth,dayGridWeek,listWeek' }}
          locale="pt"
          firstDay={1}
          events={calendarEvents}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEvents={2}
          eventDisplay="block"
          buttonText={{ dayGridMonth: 'Mês', dayGridWeek: 'Semana', listWeek: 'Lista' }}
          eventContent={(arg) => {
            const type = arg.event.extendedProps.type as string

            if (type === 'feriado') {
              return (
                <div className="flex items-center gap-0.5 px-1 overflow-hidden">
                  <span className="text-[10px]">🎉</span>
                  <span className="text-[10px] font-medium truncate" style={{ color: '#dc2626' }}>
                    {arg.event.title.slice(3)}
                  </span>
                </div>
              )
            }

            if (type === 'note') {
              return (
                <div className="flex items-center gap-0.5 px-1 py-0.5 rounded overflow-hidden w-full"
                  style={{ backgroundColor: '#10b981' }}>
                  <span className="text-[10px]">📝</span>
                  <span className="text-white text-[10px] truncate">{arg.event.title.slice(2)}</span>
                </div>
              )
            }

            // Custody event
            const bgColor = arg.event.backgroundColor
            const title = arg.event.title

            return (
              <div
                className="flex items-center gap-1 px-1 py-0.5 rounded overflow-hidden w-full"
                style={{ backgroundColor: bgColor }}
              >
                <span className="text-white truncate" style={{ fontSize: 10, fontWeight: 600 }}>
                  {title}
                </span>
              </div>
            )
          }}
        />
      </div>

      <Modal
        open={showDayModal}
        onClose={() => { setShowDayModal(false); setSelectedDate(null) }}
        title={selectedDate ? format(new Date(selectedDate + 'T12:00:00'), 'dd/MM/yyyy') : 'Detalhes'}
      >
        <div className="flex flex-col gap-3">
          {holidayOnSelectedDate && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100">
              <span>🎉</span>
              <p className="text-sm font-medium text-red-700">{holidayOnSelectedDate.name}</p>
              <span className="text-xs text-red-400 ml-auto">Feriado Nacional</span>
            </div>
          )}

          {custodyForSelectedDate.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Custódia</p>
              <div className="flex flex-col gap-1.5">
                {custodyForSelectedDate.map(({ child, parentId }) => {
                  const member = activeFamilyMembers.find((m) => m.userId === parentId)
                  const name = member?.profile.displayName ?? 'Desconhecido'
                  const color = member?.color ?? '#6b7280'
                  const initial = name.charAt(0).toUpperCase()
                  return (
                    <div key={child.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 bg-gray-50">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{name}</p>
                        {children.length > 1 && (
                          <p className="text-xs text-gray-500">{child.fullName}</p>
                        )}
                      </div>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white flex-shrink-0"
                        style={{ backgroundColor: color }}
                      >
                        Com a criança
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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
