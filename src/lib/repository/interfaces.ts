import type {
  AuditLogEntry,
  CalendarNote,
  Child,
  CustodyRegime,
  ExceptionRequest,
  Family,
  FamilyMember,
  Profile,
  VacationPeriod,
} from '@/types/domain'

export interface IAuthRepository {
  login(email: string, password: string): Promise<Profile>
  register(email: string, password: string, displayName: string): Promise<Profile>
  logout(): Promise<void>
  getCurrentUser(): Profile | null
  updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile>
  setSession(user: Profile): void
  getAllUsers(): Array<Profile & { email: string; password: string }>
  deleteUser(userId: string): Promise<void>
}

export interface IFamilyRepository {
  getFamilies(userId: string): Promise<Family[]>
  getFamily(id: string): Promise<Family | null>
  createFamily(data: Omit<Family, 'id' | 'createdAt' | 'updatedAt'>): Promise<Family>
  updateFamily(id: string, data: Partial<Family>): Promise<Family>

  getMembers(familyId: string): Promise<FamilyMember[]>
  addMember(member: Omit<FamilyMember, 'id' | 'profile'>): Promise<FamilyMember>
  updateMember(id: string, data: Partial<FamilyMember>): Promise<FamilyMember>
  removeMember(id: string): Promise<void>
}

export interface IChildRepository {
  getChildren(familyId: string): Promise<Child[]>
  getChild(id: string): Promise<Child | null>
  createChild(data: Omit<Child, 'id' | 'createdAt'>): Promise<Child>
  updateChild(id: string, data: Partial<Child>): Promise<Child>
  deleteChild(id: string): Promise<void>
}

export interface IRegimeRepository {
  getRegimes(familyId: string): Promise<CustodyRegime[]>
  getRegime(id: string): Promise<CustodyRegime | null>
  createRegime(data: Omit<CustodyRegime, 'id' | 'createdAt'>): Promise<CustodyRegime>
  updateRegime(id: string, data: Partial<CustodyRegime>): Promise<CustodyRegime>
  deleteRegime(id: string): Promise<void>
}

export interface IExceptionRepository {
  getExceptions(familyId: string): Promise<ExceptionRequest[]>
  getException(id: string): Promise<ExceptionRequest | null>
  createException(data: Omit<ExceptionRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExceptionRequest>
  updateException(id: string, data: Partial<ExceptionRequest>): Promise<ExceptionRequest>

  getAuditLog(exceptionId: string): Promise<AuditLogEntry[]>
  addAuditEntry(entry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry>
}

export interface INoteRepository {
  getNotes(familyId: string): Promise<CalendarNote[]>
  getNotesByDate(familyId: string, date: string): Promise<CalendarNote[]>
  getNote(id: string): Promise<CalendarNote | null>
  createNote(data: Omit<CalendarNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarNote>
  updateNote(id: string, data: Partial<CalendarNote>): Promise<CalendarNote>
  deleteNote(id: string): Promise<void>
}

export interface IVacationRepository {
  getVacations(familyId: string): Promise<VacationPeriod[]>
  getVacation(id: string): Promise<VacationPeriod | null>
  createVacation(data: Omit<VacationPeriod, 'id' | 'createdAt' | 'updatedAt'>): Promise<VacationPeriod>
  updateVacation(id: string, data: Partial<VacationPeriod>): Promise<VacationPeriod>
  deleteVacation(id: string): Promise<void>
}
