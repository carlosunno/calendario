import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { childRepo } from '@/lib/repository'
import { childSchema, type ChildInput } from '@/lib/validators/family.schema'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Avatar } from '@/ui/Avatar'
import type { Child } from '@/types/domain'
import { showToast } from '@/ui/Toast'

const CHILD_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

interface ChildrenStepProps {
  familyId: string
  initialChildren: Child[]
  onDone: (children: Child[]) => void
  onBack: () => void
}

export function ChildrenStep({ familyId, initialChildren, onDone, onBack }: ChildrenStepProps) {
  const [children, setChildren] = useState<Child[]>(initialChildren)
  const [showForm, setShowForm] = useState(children.length === 0)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChildInput>({
    resolver: zodResolver(childSchema),
  })

  async function onAddChild(data: ChildInput) {
    setLoading(true)
    try {
      const color = CHILD_COLORS[children.length % CHILD_COLORS.length]
      const child = await childRepo.createChild({
        familyId,
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        schoolName: data.schoolName,
        schoolRegion: data.schoolRegion,
        color,
      })
      setChildren((prev) => [...prev, child])
      reset()
      setShowForm(false)
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (children.length === 0) {
      showToast('Adicione pelo menos um filho para continuar', 'error')
      return
    }
    onDone(children)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Children list */}
      {children.length > 0 && (
        <div className="flex flex-col gap-2">
          {children.map((child) => (
            <div key={child.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Avatar name={child.fullName} color={child.color} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{child.fullName}</p>
                {child.dateOfBirth && (
                  <p className="text-xs text-gray-500">
                    Nasceu em {new Date(child.dateOfBirth).toLocaleDateString('pt-PT')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <form onSubmit={handleSubmit(onAddChild)} className="flex flex-col gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm font-semibold text-blue-800">Novo filho/a</p>
          <Input
            label="Nome completo"
            placeholder="Nome do filho/a"
            error={errors.fullName?.message}
            required
            {...register('fullName')}
          />
          <Input
            label="Data de nascimento"
            type="date"
            error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')}
          />
          <Input
            label="Escola (opcional)"
            placeholder="Nome da escola"
            {...register('schoolName')}
          />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={loading} className="flex-1">
              Adicionar
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar filho/a
        </button>
      )}

      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Anterior
        </Button>
        <Button type="button" fullWidth onClick={handleNext} disabled={children.length === 0}>
          Seguinte
        </Button>
      </div>
    </div>
  )
}
