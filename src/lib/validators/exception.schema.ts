import { z } from 'zod'

export const exceptionRequestSchema = z.object({
  childId: z.string().min(1, 'Selecione um filho'),
  exceptionType: z.enum([
    'troca_dia',
    'extensao_tempo',
    'ferias',
    'emergencia',
    'compensacao',
    'ocasiao_especial',
    'marcacao_ferias',
  ]),
  originalDate: z.string().min(1, 'Data original obrigatória'),
  originalEndDate: z.string().optional(),
  proposedDate: z.string().optional(),
  proposedEndDate: z.string().optional(),
  proposedParentId: z.string().optional(),
  reason: z.string().min(3, 'Motivo obrigatório'),
  isUrgent: z.boolean(),
})

export const rejectExceptionSchema = z.object({
  rejectionReason: z.string().min(3, 'Motivo da rejeição obrigatório'),
})

export const noteSchema = z.object({
  childId: z.string().optional(),
  noteDate: z.string().min(1, 'Data obrigatória'),
  title: z.string().optional(),
  body: z.string().min(1, 'Conteúdo da nota obrigatório'),
  noteType: z.enum(['geral', 'medica', 'escola', 'aniversario', 'extracurricular', 'tribunal']),
  visibility: z.enum(['familia', 'privado']),
})

export const vacationSchema = z.object({
  childId: z.string().optional(),
  label: z.string().min(2, 'Descrição das férias obrigatória'),
  startDate: z.string().min(1, 'Data de início obrigatória'),
  endDate: z.string().min(1, 'Data de fim obrigatória'),
  vacationType: z.enum(['ferias_escolares', 'ferias_pessoais', 'verao', 'natal', 'pascoa']),
  affectsCustody: z.boolean(),
}).refine((d) => d.startDate <= d.endDate, {
  message: 'Data de fim deve ser após data de início',
  path: ['endDate'],
})

export type ExceptionRequestInput = z.infer<typeof exceptionRequestSchema>
export type RejectExceptionInput = z.infer<typeof rejectExceptionSchema>
export type NoteInput = z.infer<typeof noteSchema>
export type VacationInput = z.infer<typeof vacationSchema>
