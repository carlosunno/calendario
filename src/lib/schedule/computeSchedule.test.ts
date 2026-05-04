import { describe, it, expect } from 'vitest'
import { computeSchedule, getParentForDate } from './computeSchedule'
import type { CustodyRegime } from '@/types/domain'
import { parseISO } from 'date-fns'

const PARENT_A = 'parent-a'
const PARENT_B = 'parent-b'
const CHILD_ID = 'child-1'
const FAMILY_ID = 'family-1'

function makeAlternatingWeeksRegime(referenceDate: string, swapDay = 1): CustodyRegime {
  return {
    id: 'regime-1',
    childId: CHILD_ID,
    familyId: FAMILY_ID,
    regimeType: 'semanas_alternadas',
    label: 'Semanas alternadas',
    effectiveFrom: '2024-01-01',
    primaryParentId: PARENT_A,
    courtOrdered: false,
    priority: 0,
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    rules: [
      {
        id: 'rule-1',
        regimeId: 'regime-1',
        ruleType: 'semanas_alternadas',
        swapDay,
        swapTime: '18:00',
        weekAParentId: PARENT_A,
        weekBParentId: PARENT_B,
        referenceDate,
      },
    ],
  }
}

function makeFixedDaysRegime(days: number[], parentId: string): CustodyRegime {
  return {
    id: 'regime-2',
    childId: CHILD_ID,
    familyId: FAMILY_ID,
    regimeType: 'dias_fixos',
    label: 'Dias fixos',
    effectiveFrom: '2024-01-01',
    primaryParentId: PARENT_A,
    courtOrdered: false,
    priority: 1, // Higher priority overrides alternating weeks
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    rules: [
      {
        id: 'rule-2',
        regimeId: 'regime-2',
        ruleType: 'dias_fixos',
        daysOfWeek: days,
        parentId,
      },
    ],
  }
}

describe('computeSchedule - alternating weeks', () => {
  it('assigns correct parents for first two weeks', () => {
    // reference Monday 2024-01-01 (week A = parent A)
    const regime = makeAlternatingWeeksRegime('2024-01-01', 1)
    const events = computeSchedule({
      regimes: [regime],
      exceptions: [],
      from: parseISO('2024-01-01'),
      to: parseISO('2024-01-14'),
      familyId: FAMILY_ID,
    })

    const mon1 = events.find((e) => e.eventDate === '2024-01-01')
    const mon2 = events.find((e) => e.eventDate === '2024-01-08')

    expect(mon1?.parentId).toBe(PARENT_A)
    expect(mon2?.parentId).toBe(PARENT_B)
  })

  it('marks Monday as exchange day when weeks alternate', () => {
    const regime = makeAlternatingWeeksRegime('2024-01-01', 1)
    const events = computeSchedule({
      regimes: [regime],
      exceptions: [],
      from: parseISO('2024-01-08'),
      to: parseISO('2024-01-08'),
      familyId: FAMILY_ID,
    })
    expect(events[0]?.eventType).toBe('troca')
  })

  it('mid-week days are custody type (not exchange)', () => {
    const regime = makeAlternatingWeeksRegime('2024-01-01', 1)
    const events = computeSchedule({
      regimes: [regime],
      exceptions: [],
      from: parseISO('2024-01-03'),
      to: parseISO('2024-01-03'),
      familyId: FAMILY_ID,
    })
    expect(events[0]?.eventType).toBe('custodia')
  })
})

describe('computeSchedule - approved exceptions', () => {
  it('overrides normal custody with approved exception', () => {
    const regime = makeAlternatingWeeksRegime('2024-01-01', 1)
    const exception = {
      id: 'exc-1',
      familyId: FAMILY_ID,
      childId: CHILD_ID,
      requestedBy: PARENT_B,
      exceptionType: 'troca_dia' as const,
      status: 'aprovado' as const,
      originalDate: '2024-01-03',
      originalParentId: PARENT_A,
      proposedDate: '2024-01-03',
      proposedParentId: PARENT_B,
      isUrgent: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
    const events = computeSchedule({
      regimes: [regime],
      exceptions: [exception],
      from: parseISO('2024-01-03'),
      to: parseISO('2024-01-03'),
      familyId: FAMILY_ID,
    })
    expect(events[0]?.parentId).toBe(PARENT_B)
    expect(events[0]?.eventType).toBe('excecao')
    expect(events[0]?.isException).toBe(true)
  })

  it('does not apply pending exceptions', () => {
    const regime = makeAlternatingWeeksRegime('2024-01-01', 1)
    const exception = {
      id: 'exc-2',
      familyId: FAMILY_ID,
      childId: CHILD_ID,
      requestedBy: PARENT_B,
      exceptionType: 'troca_dia' as const,
      status: 'pendente' as const,
      originalDate: '2024-01-03',
      originalParentId: PARENT_A,
      proposedParentId: PARENT_B,
      isUrgent: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }
    const events = computeSchedule({
      regimes: [regime],
      exceptions: [exception],
      from: parseISO('2024-01-03'),
      to: parseISO('2024-01-03'),
      familyId: FAMILY_ID,
    })
    expect(events[0]?.parentId).toBe(PARENT_A)
    expect(events[0]?.isException).toBe(false)
  })
})

describe('getParentForDate', () => {
  it('returns correct parent for a given date', () => {
    const regime = makeAlternatingWeeksRegime('2024-01-01', 1)
    const parent = getParentForDate(parseISO('2024-01-05'), [regime], CHILD_ID, [])
    expect(parent).toBe(PARENT_A)
  })

  it('returns parent B for second week', () => {
    const regime = makeAlternatingWeeksRegime('2024-01-01', 1)
    const parent = getParentForDate(parseISO('2024-01-10'), [regime], CHILD_ID, [])
    expect(parent).toBe(PARENT_B)
  })

  it('returns null when no regime active', () => {
    const parent = getParentForDate(parseISO('2024-01-10'), [], CHILD_ID, [])
    expect(parent).toBeNull()
  })
})

describe('fixed days override', () => {
  it('fixed day with higher priority overrides alternating week', () => {
    const altRegime = makeAlternatingWeeksRegime('2024-01-01', 1) // priority 0
    const fixedRegime = makeFixedDaysRegime([3], PARENT_B) // Wednesday, priority 1

    // 2024-01-03 is a Wednesday
    const events = computeSchedule({
      regimes: [altRegime, fixedRegime],
      exceptions: [],
      from: parseISO('2024-01-03'),
      to: parseISO('2024-01-03'),
      familyId: FAMILY_ID,
    })
    // The fixed regime has priority=1 and Wednesday matches parent B
    // The alternating regime has priority=0 and would give parent A
    // Only one regime wins (highest priority), and it's fixed days
    expect(events[0]?.parentId).toBe(PARENT_B)
  })
})
