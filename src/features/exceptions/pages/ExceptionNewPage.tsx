import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { exceptionRepo, regimeRepo } from '@/lib/repository'
import { exceptionRequestSchema, type ExceptionRequestInput } from '@/lib/validators/exception.schema'
import { Button } from '@/ui/Button'
import { Input, Select, Textarea, Checkbox } from '@/ui/Input'
import { getParentForDate } from '@/lib/schedule/computeSchedule'
import { useState, useEffect } from 'react'
import type { CustodyRegime } from '@/types/domain'
import { showToast } from '@/ui/Toast'

const EXCEPTION_TYPES = [
  { value: 'troca_dia', label: 'Troca de dia' },
  { value: 'extensao_tempo', label: 'Extensão de tempo' },
  { value: 'ferias', label: 'Férias' },
  { value: 'emergencia', label: 'Emergência' },
  { value: 'compensacao', label: 'Compensação' },
  { value: 'ocasiao_especial', label: 'Ocasião especial' },
  { value: 'marcacao_ferias', label: 'Marcação de férias' },
]

export function ExceptionNewPage() {
  const { activeFamily, children, activeFamilyMembers } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [regimes, setRegimes] = useState<CustodyRegime[]>([])

  const defaultDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ExceptionRequestInput>({
    resolver: zodResolver(exceptionRequestSchema),
    defaultValues: {
      childId: children[0]?.id ?? '',
      exceptionType: 'troca_dia',
      originalDate: defaultDate,
      isUrgent: false,
    },
  })

  useEffect(() => {
    if (!activeFamily) return
    regimeRepo.getRegimes(activeFamily.id).then(setRegimes)
  }, [activeFamily])

  const watchedChildId = watch('childId')
  const watchedDate = watch('originalDate')

  const originalParentId = watchedChildId && watchedDate
    ? getParentForDate(new Date(watchedDate + 'T12:00:00'), regimes, watchedChildId, []) ?? ''
    : ''

  const otherParents = activeFamilyMembers.filter((m) => m.userId !== user?.id)

  async function onSubmit(data: ExceptionRequestInput) {
    if (!activeFamily || !user) return
    try {
      await exceptionRepo.createException({
        familyId: activeFamily.id,
        childId: data.childId,
        requestedBy: user.id,
        exceptionType: data.exceptionType,
        status: 'pendente',
        originalDate: data.originalDate,
        originalEndDate: data.originalEndDate,
        originalParentId,
        proposedDate: data.proposedDate,
        proposedEndDate: data.proposedEndDate,
        proposedParentId: data.proposedParentId,
        reason: data.reason,
        isUrgent: data.isUrgent,
      })
      showToast('Pedido enviado com sucesso', 'success')
      navigate('/exceptions')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900">Novo Pedido de Alteração</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {children.length > 1 && (
          <Select label="Filho/a" error={errors.childId?.message} required {...register('childId')}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </Select>
        )}

        <Select label="Tipo de pedido" error={errors.exceptionType?.message} required {...register('exceptionType')}>
          {EXCEPTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>

        <Input
          label="Data original"
          type="date"
          error={errors.originalDate?.message}
          required
          {...register('originalDate')}
        />

        <Input
          label="Data de fim (opcional, para multi-dia)"
          type="date"
          error={errors.originalEndDate?.message}
          {...register('originalEndDate')}
        />

        <Input
          label="Data proposta (para trocas)"
          type="date"
          error={errors.proposedDate?.message}
          {...register('proposedDate')}
        />

        {otherParents.length > 0 && (
          <Select
            label="Responsável proposto"
            error={errors.proposedParentId?.message}
            {...register('proposedParentId')}
          >
            <option value="">Nenhum</option>
            {activeFamilyMembers.map((m) => (
              <option key={m.userId} value={m.userId}>{m.profile.displayName}</option>
            ))}
          </Select>
        )}

        <Textarea
          label="Motivo"
          placeholder="Explique o motivo do pedido..."
          error={errors.reason?.message}
          required
          {...register('reason')}
        />

        <Checkbox label="Pedido urgente" {...register('isUrgent')} />

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          Enviar pedido
        </Button>
      </form>
    </div>
  )
}
