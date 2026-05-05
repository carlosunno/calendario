import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { familyRepo } from '@/lib/repository'
import { familySchema, type FamilyInput } from '@/lib/validators/family.schema'
import { Button } from '@/ui/Button'
import { Input, Select, Checkbox } from '@/ui/Input'
import type { Child, CustodyRegime, Family } from '@/types/domain'
import { showToast } from '@/ui/Toast'
import { lsGet, lsSave, genId, now } from '@/lib/repository/localStorage/LocalStorage'
import type { FamilyMember } from '@/types/domain'

interface FamilyStepProps {
  userId: string
  onDone: (family: Family, children: Child[]) => void
  onJoinDone: (family: Family) => void
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

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

export function FamilyStep({ userId, onDone, onJoinDone }: FamilyStepProps) {
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'nova' | 'aderir'>('nova')
  const [joinCode, setJoinCode] = useState('')
  const [joinRole, setJoinRole] = useState<'pai' | 'mae' | 'avo' | 'cuidador'>('mae')
  const [joining, setJoining] = useState(false)

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

  async function handleJoin() {
    const code = joinCode.trim()
    if (!code) { showToast('Insira o código da família.', 'error'); return }
    setJoining(true)
    try {
      const families = lsGet<Family>('cal_families')
      const family = families.find((f) => f.id === code)
      if (!family) { showToast('Família não encontrada. Verifique o código.', 'error'); setJoining(false); return }

      const members = lsGet<FamilyMember>('cal_members')
      if (members.some((m) => m.familyId === family.id && m.userId === userId)) {
        showToast('Já é membro desta família.', 'error'); setJoining(false); return
      }

      const colorIdx = members.filter((m) => m.familyId === family.id).length
      const newMember: FamilyMember = {
        id: genId(),
        familyId: family.id,
        userId,
        profile: { id: userId, displayName: 'Eu', email: '', locale: 'pt-PT', timezone: 'Europe/Lisbon', createdAt: now() },
        role: joinRole,
        inviteStatus: 'aceite',
        color: COLORS[colorIdx % COLORS.length],
        canApprove: true,
        canRequest: true,
        isViewOnly: false,
      }
      members.push(newMember)
      lsSave('cal_members', members)

      // Fix regimes that still have weekBParentId === weekAParentId
      const regimes = lsGet<CustodyRegime>('cal_regimes')
      const updated = regimes.map((r) => {
        if (r.familyId !== family.id) return r
        const newRules = r.rules.map((rule) => {
          if (rule.ruleType !== 'semanas_alternadas') return rule
          return rule.weekBParentId === rule.weekAParentId
            ? { ...rule, weekBParentId: userId }
            : rule
        })
        return { ...r, rules: newRules }
      })
      lsSave('cal_regimes', updated)

      onJoinDone(family)
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mode toggle */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200">
        <button
          type="button"
          onClick={() => setMode('nova')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === 'nova' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Criar nova família
        </button>
        <button
          type="button"
          onClick={() => setMode('aderir')}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            mode === 'aderir' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Aderir com código
        </button>
      </div>

      {mode === 'aderir' ? (
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
            O outro responsável partilha o código em <strong>Família → Código da família</strong>. Cole-o aqui para se juntar.
          </div>
          <Input
            label="Código da família"
            placeholder="Cole aqui o código"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">O seu papel</p>
            <select
              className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={joinRole}
              onChange={(e) => setJoinRole(e.target.value as typeof joinRole)}
            >
              <option value="mae">Mãe</option>
              <option value="pai">Pai</option>
              <option value="avo">Avó/Avô</option>
              <option value="cuidador">Cuidador</option>
            </select>
          </div>
          <Button type="button" fullWidth loading={joining} onClick={handleJoin}>
            Aderir à família
          </Button>
        </div>
      ) : (
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
          <Checkbox label="Custódia definida por ordem judicial" {...register('courtOrdered')} />
          {errors.courtOrdered?.message && (
            <p className="text-xs text-red-600">{errors.courtOrdered.message}</p>
          )}
          <Button type="submit" fullWidth loading={loading} className="mt-2">
            Seguinte
          </Button>
        </form>
      )}
    </div>
  )
}
