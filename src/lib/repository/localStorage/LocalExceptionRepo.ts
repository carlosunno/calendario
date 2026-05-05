import type { AuditLogEntry, CalendarNote, Expense, ExceptionRequest, VacationPeriod } from '@/types/domain'
import type { IExceptionRepository, IExpenseRepository, INoteRepository, IVacationRepository } from '../interfaces'
import { genId, lsAdd, lsGet, lsGetOne, lsUpdate, lsDelete, now } from './LocalStorage'

const EXCEPTIONS_KEY = 'cal_exceptions'
const AUDIT_KEY = 'cal_audit'
const NOTES_KEY = 'cal_notes'
const VACATIONS_KEY = 'cal_vacations'

export class LocalExceptionRepo implements IExceptionRepository {
  async getExceptions(familyId: string): Promise<ExceptionRequest[]> {
    return lsGet<ExceptionRequest>(EXCEPTIONS_KEY)
      .filter((e) => e.familyId === familyId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async getException(id: string): Promise<ExceptionRequest | null> {
    return lsGetOne<ExceptionRequest>(EXCEPTIONS_KEY, id)
  }

  async createException(data: Omit<ExceptionRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExceptionRequest> {
    const exc: ExceptionRequest = { ...data, id: genId(), createdAt: now(), updatedAt: now() }
    lsAdd(EXCEPTIONS_KEY, exc)
    await this.addAuditEntry({ exceptionId: exc.id, actorId: data.requestedBy, action: 'criado', newState: exc, createdAt: now() })
    return exc
  }

  async updateException(id: string, data: Partial<ExceptionRequest>): Promise<ExceptionRequest> {
    return lsUpdate<ExceptionRequest>(EXCEPTIONS_KEY, id, { ...data, updatedAt: now() })
  }

  async getAuditLog(exceptionId: string): Promise<AuditLogEntry[]> {
    return lsGet<AuditLogEntry>(AUDIT_KEY)
      .filter((e) => e.exceptionId === exceptionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async addAuditEntry(entry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> {
    const log: AuditLogEntry = { ...entry, id: genId() }
    return lsAdd(AUDIT_KEY, log)
  }
}

export class LocalNoteRepo implements INoteRepository {
  async getNotes(familyId: string): Promise<CalendarNote[]> {
    return lsGet<CalendarNote>(NOTES_KEY)
      .filter((n) => n.familyId === familyId)
      .sort((a, b) => b.noteDate.localeCompare(a.noteDate))
  }

  async getNotesByDate(familyId: string, date: string): Promise<CalendarNote[]> {
    return lsGet<CalendarNote>(NOTES_KEY).filter((n) => n.familyId === familyId && n.noteDate === date)
  }

  async getNote(id: string): Promise<CalendarNote | null> {
    return lsGetOne<CalendarNote>(NOTES_KEY, id)
  }

  async createNote(data: Omit<CalendarNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarNote> {
    const note: CalendarNote = { ...data, id: genId(), createdAt: now(), updatedAt: now() }
    return lsAdd(NOTES_KEY, note)
  }

  async updateNote(id: string, data: Partial<CalendarNote>): Promise<CalendarNote> {
    return lsUpdate<CalendarNote>(NOTES_KEY, id, { ...data, updatedAt: now() })
  }

  async deleteNote(id: string): Promise<void> {
    const notes = lsGet<CalendarNote>(NOTES_KEY).filter((n) => n.id !== id)
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  }
}

export class LocalVacationRepo implements IVacationRepository {
  async getVacations(familyId: string): Promise<VacationPeriod[]> {
    return lsGet<VacationPeriod>(VACATIONS_KEY)
      .filter((v) => v.familyId === familyId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }

  async getVacation(id: string): Promise<VacationPeriod | null> {
    return lsGetOne<VacationPeriod>(VACATIONS_KEY, id)
  }

  async createVacation(data: Omit<VacationPeriod, 'id' | 'createdAt' | 'updatedAt'>): Promise<VacationPeriod> {
    const vac: VacationPeriod = { ...data, id: genId(), createdAt: now(), updatedAt: now() }
    return lsAdd(VACATIONS_KEY, vac)
  }

  async updateVacation(id: string, data: Partial<VacationPeriod>): Promise<VacationPeriod> {
    return lsUpdate<VacationPeriod>(VACATIONS_KEY, id, { ...data, updatedAt: now() })
  }

  async deleteVacation(id: string): Promise<void> {
    const vacations = lsGet<VacationPeriod>(VACATIONS_KEY).filter((v) => v.id !== id)
    localStorage.setItem(VACATIONS_KEY, JSON.stringify(vacations))
  }
}

const EXPENSES_KEY = 'cal_expenses'

export class LocalExpenseRepo implements IExpenseRepository {
  async getExpenses(familyId: string): Promise<Expense[]> {
    return lsGet<Expense>(EXPENSES_KEY)
      .filter((e) => e.familyId === familyId)
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  async getExpense(id: string): Promise<Expense | null> {
    return lsGetOne<Expense>(EXPENSES_KEY, id)
  }

  async createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    const expense: Expense = { ...data, id: genId(), createdAt: now(), updatedAt: now() }
    return lsAdd(EXPENSES_KEY, expense)
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    return lsUpdate<Expense>(EXPENSES_KEY, id, { ...data, updatedAt: now() })
  }

  async deleteExpense(id: string): Promise<void> {
    lsDelete(EXPENSES_KEY, id)
  }
}
