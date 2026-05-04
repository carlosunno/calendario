import { z } from 'zod'

export const profileSchema = z.object({
  displayName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  locale: z.string().default('pt-PT'),
  timezone: z.string().default('Europe/Lisbon'),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
})

export const registerSchema = z.object({
  displayName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path: ['confirmPassword'],
})

export const familySchema = z.object({
  name: z.string().min(2, 'Nome da família obrigatório'),
  countryCode: z.string().min(1, 'País obrigatório'),
  regionCode: z.string().optional(),
  custodyType: z.enum(['partilhada', 'principal_mae', 'principal_pai', 'outra']),
  courtOrdered: z.boolean(),
})

export const childSchema = z.object({
  fullName: z.string().min(2, 'Nome do filho obrigatório'),
  dateOfBirth: z.string().optional(),
  schoolName: z.string().optional(),
  schoolRegion: z.string().optional(),
  color: z.string().optional(),
})

export const regimeRuleSchema = z.object({
  ruleType: z.enum(['semanas_alternadas', 'dias_fixos', 'custodia_principal', 'personalizado']),
  swapDay: z.number().min(0).max(6).optional(),
  swapTime: z.string().optional(),
  weekAParentId: z.string().optional(),
  weekBParentId: z.string().optional(),
  referenceDate: z.string().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  parentId: z.string().optional(),
  primaryParentId: z.string().optional(),
  visitingParentId: z.string().optional(),
  visitDays: z.array(z.number().min(0).max(6)).optional(),
  overnight: z.boolean().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type FamilyInput = z.infer<typeof familySchema>
export type ChildInput = z.infer<typeof childSchema>
export type RegimeRuleInput = z.infer<typeof regimeRuleSchema>
