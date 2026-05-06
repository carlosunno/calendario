import type { PublicHoliday } from '@/types/domain'

// Anonymous Gregorian algorithm for Easter Sunday
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1 // 0-based
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function fmt(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getPortugueseHolidays(year: number): PublicHoliday[] {
  const easter = easterSunday(year)

  const fixed: Array<{ date: string; name: string }> = [
    { date: `${year}-01-01`, name: 'Ano Novo' },
    { date: `${year}-04-25`, name: 'Dia da Liberdade' },
    { date: `${year}-05-01`, name: 'Dia do Trabalhador' },
    { date: `${year}-06-10`, name: 'Dia de Portugal' },
    { date: `${year}-08-15`, name: 'Assunção de Nossa Senhora' },
    { date: `${year}-10-05`, name: 'Implantação da República' },
    { date: `${year}-11-01`, name: 'Dia de Todos os Santos' },
    { date: `${year}-12-01`, name: 'Restauração da Independência' },
    { date: `${year}-12-08`, name: 'Imaculada Conceição' },
    { date: `${year}-12-25`, name: 'Natal' },
  ]

  const moveable: Array<{ date: string; name: string }> = [
    { date: fmt(addDays(easter, -2)), name: 'Sexta-feira Santa' },
    { date: fmt(easter), name: 'Páscoa' },
    { date: fmt(addDays(easter, 60)), name: 'Corpo de Deus' },
  ]

  return [...fixed, ...moveable].map((h) => ({
    ...h,
    type: 'nacional',
    countryCode: 'PT',
  }))
}
