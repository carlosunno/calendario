import { create } from 'zustand'
import type { CalendarEvent, CalendarNote, ExceptionRequest } from '@/types/domain'

type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek'

interface CalendarState {
  view: CalendarView
  currentDate: Date
  events: CalendarEvent[]
  notes: CalendarNote[]
  exceptions: ExceptionRequest[]
  selectedDate: string | null
  isLoading: boolean

  setView: (view: CalendarView) => void
  setCurrentDate: (date: Date) => void
  setEvents: (events: CalendarEvent[]) => void
  setNotes: (notes: CalendarNote[]) => void
  setExceptions: (exceptions: ExceptionRequest[]) => void
  setSelectedDate: (date: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useCalendarStore = create<CalendarState>()((set) => ({
  view: 'dayGridMonth',
  currentDate: new Date(),
  events: [],
  notes: [],
  exceptions: [],
  selectedDate: null,
  isLoading: false,

  setView: (view) => set({ view }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setEvents: (events) => set({ events }),
  setNotes: (notes) => set({ notes }),
  setExceptions: (exceptions) => set({ exceptions }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
