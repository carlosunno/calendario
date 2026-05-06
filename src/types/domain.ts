export type CustodyType = 'partilhada' | 'principal_mae' | 'principal_pai' | 'outra'
export type RegimeType = 'semanas_alternadas' | 'dias_fixos' | 'custodia_principal' | 'personalizado'
export type MemberRole = 'pai' | 'mae' | 'avo' | 'cuidador'
export type InviteStatus = 'pendente' | 'aceite' | 'rejeitado'
export type ExceptionType =
  | 'troca_dia'
  | 'extensao_tempo'
  | 'ferias'
  | 'emergencia'
  | 'compensacao'
  | 'ocasiao_especial'
  | 'marcacao_ferias'
export type ExceptionStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado' | 'expirado'
export type NoteType = 'geral' | 'medica' | 'escola' | 'aniversario' | 'extracurricular' | 'tribunal'
export type VacationType = 'ferias_escolares' | 'ferias_pessoais' | 'verao' | 'natal' | 'pascoa'
export type CalendarEventType = 'custodia' | 'troca' | 'feriado' | 'feriado_escolar' | 'excecao' | 'ferias'

export interface Profile {
  id: string
  displayName: string
  email: string
  avatarUrl?: string
  phone?: string
  locale: string
  timezone: string
  createdAt: string
}

export interface Family {
  id: string
  name: string
  countryCode: string
  regionCode?: string
  custodyType: CustodyType
  courtOrdered: boolean
  createdAt: string
  updatedAt: string
}

export interface FamilyMember {
  id: string
  familyId: string
  userId: string
  profile: Profile
  role: MemberRole
  inviteStatus: InviteStatus
  color: string
  canApprove: boolean
  canRequest: boolean
  isViewOnly: boolean
}

export interface Child {
  id: string
  familyId: string
  fullName: string
  dateOfBirth?: string
  schoolName?: string
  schoolRegion?: string
  color: string
  avatarUrl?: string
  notes?: string
  createdAt: string
}

export interface RegimeRule {
  id: string
  regimeId: string
  ruleType: RegimeType
  // alternating_weeks
  swapDay?: number
  swapTime?: string
  weekAParentId?: string
  weekBParentId?: string
  referenceDate?: string
  // fixed_days
  daysOfWeek?: number[]
  startTime?: string
  endTime?: string
  parentId?: string
  // sole_custody
  primaryParentId?: string
  visitingParentId?: string
  visitDays?: number[]
  overnight?: boolean
}

export interface CustodyRegime {
  id: string
  childId: string
  familyId: string
  regimeType: RegimeType
  label: string
  effectiveFrom: string
  effectiveUntil?: string
  primaryParentId: string
  courtOrdered: boolean
  priority: number
  isActive: boolean
  rules: RegimeRule[]
  createdAt: string
}

export interface CalendarEvent {
  id: string
  familyId: string
  childId: string
  regimeId?: string
  eventDate: string
  startDatetime?: string
  endDatetime?: string
  parentId: string
  eventType: CalendarEventType
  isException: boolean
  exceptionId?: string
  label?: string
}

export interface ExceptionRequest {
  id: string
  familyId: string
  childId: string
  requestedBy: string
  exceptionType: ExceptionType
  status: ExceptionStatus
  originalDate: string
  originalEndDate?: string
  originalParentId: string
  proposedDate?: string
  proposedEndDate?: string
  proposedParentId?: string
  reason?: string
  isUrgent: boolean
  respondedBy?: string
  respondedAt?: string
  rejectionReason?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface AuditLogEntry {
  id: string
  exceptionId: string
  actorId: string
  action: 'criado' | 'aprovado' | 'rejeitado' | 'cancelado' | 'expirado'
  previousState?: Partial<ExceptionRequest>
  newState?: Partial<ExceptionRequest>
  createdAt: string
}

export interface CalendarNote {
  id: string
  familyId: string
  childId?: string
  authorId: string
  noteDate: string
  title?: string
  body: string
  noteType: NoteType
  visibility: 'familia' | 'privado'
  attachments: Array<{ name: string; url: string; mimeType: string }>
  createdAt: string
  updatedAt: string
}

export interface VacationPeriod {
  id: string
  familyId: string
  childId?: string
  requestedBy: string
  label: string
  startDate: string
  endDate: string
  vacationType: VacationType
  affectsCustody: boolean
  status: ExceptionStatus
  createdAt: string
  updatedAt: string
}

export interface PublicHoliday {
  date: string
  name: string
  type: string
  countryCode: string
  regionCode?: string
}

export type ExpenseCategory = 'saude' | 'escola' | 'desporto' | 'alimentacao' | 'vestuario' | 'lazer' | 'outro'
export type ExpenseSplit = 'total' | 'partilhada'
export type ExpenseStatus = 'pendente' | 'paga' | 'aguarda_confirmacao' | 'confirmada' | 'disputada'

export interface Expense {
  id: string
  familyId: string
  childId?: string
  description: string
  amount: number
  date: string
  category: ExpenseCategory
  paidBy: string
  splitType: ExpenseSplit
  // splitRatio: fraction the OTHER parent owes (0.5 = 50/50, 1.0 = other pays 100%)
  splitRatio: number
  status: ExpenseStatus
  confirmedBy?: string
  confirmedAt?: string
  notes?: string
  receipts?: string[]
  createdAt: string
  updatedAt: string
}

// View models (enriched for UI)
export interface EnrichedCalendarEvent extends CalendarEvent {
  parentName: string
  parentColor: string
  childName: string
}

export interface EnrichedExceptionRequest extends ExceptionRequest {
  requestedByProfile: Profile
  child: Child
  auditLog: AuditLogEntry[]
  originalParentProfile: Profile
  proposedParentProfile?: Profile
}
