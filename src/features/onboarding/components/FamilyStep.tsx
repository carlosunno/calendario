import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { familyRepo } from '@/lib/repository'
import { familySchema, type FamilyInput } from '@/lib/validators/family.schema'
import { Button } from '@/ui/Button'
import { Input, Select, Checkbox } from '@/ui/Input'
import type { Child, Family } from '@/types/domain'
import { showToast } from '@/ui/Toast'

interface FamilyStepProps {
  userId: string
  onDone: (family: Family, children: Child[]) => void
}

const COUNTRIES = [
  { code: 'PT', name: 'Portugal' },
  { code: 'BR', name: 'Brasil' },
  { code: 'ES', name: 'Espanha' },
  { code: 'FR', name: 'França' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'DE', name: 'Alemanha' },
  { code: 'US', name: 'Estados Unidos' },
]

export function FamilyStep({ userId, onDone }: FamilyStepProps) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FamilyInput>({
    resolver: zodResolver(familySchema),
    defaultValues: { countryCode: 'PT', custodyType: 'partilhada', courtOrdered: false },
  })

  async function onSubmit(data: FamilyInput) {
    setLoading(true)
    try {
      const family = await familyRepo.createFamily({
        name: data.name,
        countryCode: data.countryCode,
        regionCode: data.regionCode,
        custodyType: data.custodyType,
        courtOrdered: data.courtOrdered,
      })

      // Add current user as primary parent
      await familyRepo.addMember({
        familyId: family.id,
        userId,
        role: 'pai',
        inviteStatus: 'aceite',
        color: '#3b82f6',
        canApprove: true,
        canRequest: true,
        isViewOnly: false,
      })

      onDone(family, [])
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        label="Nome da família"
        placeholder="ex: Família Silva"
        error={errors.name?.message}
        required
        {...register('name')}
      />

      <Select label="País" error={errors.countryCode?.message} required {...register('countryCode')}>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </Select>

      <Select label="Tipo de custódia" error={errors.custodyType?.message} required {...register('custodyType')}>
        <option value="partilhada">Custódia Partilhada</option>
        <option value="principal_mae">Custódia Principal — Mãe</option>
        <option value="principal_pai">Custódia Principal — Pai</option>
        <option value="outra">Outro</option>
      </Select>

      <Checkbox
        label="Custódia definida por ordem judicial"
        {...register('courtOrdered')}
      />

      {errors.courtOrdered?.message && (
        <p className="text-xs text-red-600">{errors.courtOrdered.message}</p>
      )}

      <Button type="submit" fullWidth loading={loading} className="mt-2">
        Seguinte
      </Button>
    </form>
  )
}
