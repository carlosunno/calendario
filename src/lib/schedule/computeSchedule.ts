import {
  addDays,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { CalendarEvent, CustodyRegime, ExceptionRequest, RegimeRule } from '@/types/domain'

function genId() {
  return Math.random().toString(36).slice(2, 11)
}

function getParentForAlternatingWeek(rule: RegimeRule, date: Date): string | null {
  if (!rule.weekAParentId || !rule.weekBParentId || !rule.referenceDate) return null
  const ref = parseISO(rule.referenceDate)
  const weeksDiff = differenceInCalendarWeeks(startOfDay(date), startOfDay(ref), { weekStartsOn: 1 })
  return weeksDiff % 2 === 0 ? rule.weekAParentId : rule.weekBParentId
}

function getParentForFixedDays(rule: RegimeRule, date: Date): string | null {
  if (!rule.daysOfWeek || !rule.parentId) return null
  const dow = date.getDay()
  return rule.daysOfWeek.includes(dow) ? rule.parentId : null
}

function getParentForSoleCustody(rule: RegimeRule, date: Date): string | null {
  if (!rule.primaryParentId) return null
  if (rule.visitDays && rule.visitingParentId) {
    const dow = date.getDay()
    if (rule.visitDays.includes(dow)) return rule.visitingParentId
  }
  return rule.primaryParentId
}

function resolveParentFromRules(rules: RegimeRule[], date: Date): string | null {
  // Fixed days and sole_custody override alternating weeks (applied in order, last wins)
  let resolved: string | null = null
  for (const rule of rules) {
    if (rule.ruleType === 'semanas_alternadas') {
      resolved = getParentForAlternatingWeek(rule, date) ?? resolved
    } else if (rule.ruleType === 'dias_fixos') {
      const r = getParentForFixedDays(rule, date)
      if (r) resolved = r
    } else if (rule.ruleType === 'custodia_principal') {
      resolved = getParentForSoleCustody(rule, date) ?? resolved
    }
  }
  return resolved
}

function isSwapDay(rules: RegimeRule[], date: Date): boolean {
  return rules.some((r) => {
    if (r.ruleType !== 'semanas_alternadas' || r.swapDay === undefined || !r.referenceDate) return false
    if (date.getDay() !== r.swapDay) return false
    // Confirm this is actually a transition week
    const prev = addDays(date, -7)
    const parentToday = getParentForAlternatingWeek(r, date)
    const parentPrev = getParentForAlternatingWeek(r, prev)
    return parentToday !== parentPrev
  })
}

export interface ScheduleOptions {
  regimes: CustodyRegime[]
  exceptions: ExceptionRequest[]
  from: Date
  to: Date
  familyId: string
}

export function computeSchedule(opts: ScheduleOptions): CalendarEvent[] {
  const { regimes, exceptions, from, to, familyId } = opts
  const days = eachDayOfInterval({ start: from, end: to })
  const events: CalendarEvent[] = []

  const approvedExceptions = exceptions.filter((e) => e.status === 'aprovado')

  for (const day of days) {
    const dateStr = format(day, 'yyyy-MM-dd')

    // Find active regimes for this day (can have multiple children)
    const activeRegimes = regimes.filter((r) => {
      if (!r.isActive) return false
      if (dateStr < r.effectiveFrom) return false
      if (r.effectiveUntil && dateStr > r.effectiveUntil) return false
      return true
    })

    // Group by child
    const childIds = [...new Set(activeRegimes.map((r) => r.childId))]

    for (const childId of childIds) {
      // Pick highest-priority active regime for this child
      const childRegimes = activeRegimes
        .filter((r) => r.childId === childId)
        .sort((a, b) => b.priority - a.priority)

      if (childRegimes.length === 0) continue

      const regime = childRegimes[0]

      // Check if there's an approved exception for this day/child
      const exception = approvedExceptions.find((e) => {
        if (e.childId !== childId) return false
        if (e.originalDate === dateStr) return true
        if (e.originalEndDate && e.originalDate <= dateStr && dateStr <= e.originalEndDate) return true
        return false
      })

      if (exception) {
        events.push({
          id: genId(),
          familyId,
          childId,
          regimeId: regime.id,
          eventDate: dateStr,
          parentId: exception.proposedParentId ?? exception.originalParentId,
          eventType: 'excecao',
          isException: true,
          exceptionId: exception.id,
          label: exceptionTypeLabel(exception.exceptionType),
        })
        continue
      }

      const parentId = resolveParentFromRules(regime.rules, day)
      if (!parentId) continue

      const isExchange = isSwapDay(regime.rules, day)

      events.push({
        id: genId(),
        familyId,
        childId,
        regimeId: regime.id,
        eventDate: dateStr,
        parentId,
        eventType: isExchange ? 'troca' : 'custodia',
        isException: false,
      })
    }
  }

  return events
}

function exceptionTypeLabel(type: ExceptionRequest['exceptionType']): string {
  const labels: Record<string, string> = {
    troca_dia: 'Troca de dia',
    extensao_tempo: 'Extensão de tempo',
    ferias: 'Férias',
    emergencia: 'Emergência',
    compensacao: 'Compensação',
    ocasiao_especial: 'Ocasião especial',
    marcacao_ferias: 'Marcação de férias',
  }
  return labels[type] ?? type
}

export function getParentForDate(
  date: Date,
  regimes: CustodyRegime[],
  childId: string,
  exceptions: ExceptionRequest[]
): string | null {
  const dateStr = format(date, 'yyyy-MM-dd')
  const activeRegimes = regimes
    .filter((r) => r.childId === childId && r.isActive)
    .filter((r) => dateStr >= r.effectiveFrom && (!r.effectiveUntil || dateStr <= r.effectiveUntil))
    .sort((a, b) => b.priority - a.priority)

  if (activeRegimes.length === 0) return null

  const regime = activeRegimes[0]
  const approvedEx = exceptions.find(
    (e) =>
      e.status === 'aprovado' &&
      e.childId === childId &&
      isWithinInterval(date, {
        start: parseISO(e.originalDate),
        end: parseISO(e.originalEndDate ?? e.originalDate),
      })
  )

  if (approvedEx) return approvedEx.proposedParentId ?? approvedEx.originalParentId
  return resolveParentFromRules(regime.rules, date)
}
