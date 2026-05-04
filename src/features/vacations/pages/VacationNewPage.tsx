import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { vacationRepo } from '@/lib/repository'
import { vacationSchema, type VacationInput } from '@/lib/validators/exception.schema'
import { Button } from '@/ui/Button'
import { Input, Select, Checkbox } from '@/ui/Input'
import { showToast } from '@/ui/Toast'

export function VacationNewPage() {
  const { activeFamily, children } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<VacationInput>({
    resolver: zodResolver(vacationSchema),
    defaultValues: {
      vacationType: 'ferias_pessoais',
      affectsCustody: true,
      childId: children[0]?.id ?? '',
    },
  })

  async function onSubmit(data: VacationInput) {
    if (!activeFamily || !user) return
    try {
      await vacationRepo.createVacation({
        familyId: activeFamily.id,
        childId: data.childId || undefined,
        requestedBy: user.id,
        label: data.label,
        startDate: data.startDate,
        endDate: data.endDate,
        vacationType: data.vacationType,
        affectsCustody: data.affectsCustody,
        status: 'pendente',
      })
      showToast('Férias enviadas para aprovação', 'success')
      navigate('/vacations')
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
        <h2 className="text-lg font-bold text-gray-900">Marcar Férias</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Select label="Tipo de férias" required error={errors.vacationType?.message} {...register('vacationType')}>
          <option value="ferias_pessoais">🌴 Férias Pessoais</option>
          <option value="ferias_escolares">🏫 Férias Escolares</option>
          <option value="verao">☀️ Verão</option>
          <option value="natal">🎄 Natal</option>
          <option value="pascoa">🐣 Páscoa</option>
        </Select>

        <Input
          label="Descrição"
          placeholder="ex: Férias na Madeira"
          required
          error={errors.label?.message}
          {...register('label')}
        />

        {children.length > 0 && (
          <Select label="Filho/a (opcional)" {...register('childId')}>
            <option value="">Todos os filhos</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </Select>
        )}

        <Input label="Data de início" type="date" required error={errors.startDate?.message} {...register('startDate')} />
        <Input label="Data de fim" type="date" required error={errors.endDate?.message} {...register('endDate')} />

        <Checkbox label="Afecta custódia (requer aprovação do outro responsável)" {...register('affectsCustody')} />

        <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800">
          Se as férias afectarem a custódia, o outro responsável receberá um pedido de aprovação.
        </div>

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          Enviar pedido de férias
        </Button>
      </form>
    </div>
  )
}
