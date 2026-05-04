import { useState } from 'react'
import { regimeRepo, familyRepo } from '@/lib/repository'
import { Button } from '@/ui/Button'
import { Select } from '@/ui/Input'
import type { Child, CustodyRegime, Family, FamilyMember, RegimeRule } from '@/types/domain'
import { showToast } from '@/ui/Toast'
import { format } from 'date-fns'

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEK_DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

interface RegimeStepProps {
  family: Family
  children: Child[]
  userId: string
  onDone: (regime: CustodyRegime) => void
  onBack: () => void
}

type RegimeType = 'semanas_alternadas' | 'dias_fixos' | 'custodia_principal'

export function RegimeStep({ family, children, userId, onDone, onBack }: RegimeStepProps) {
  const [regimeType, setRegimeType] = useState<RegimeType>('semanas_alternadas')
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? '')
  const [swapDay, setSwapDay] = useState(1) // Monday
  const [weekAParentId] = useState(userId)
  const [fixedDays, setFixedDays] = useState<number[]>([])
  const [primaryParentId] = useState(userId)
  const [_visitDays] = useState<number[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(false)
  const [membersLoaded, setMembersLoaded] = useState(false)

  // Load family members on first render
  if (!membersLoaded) {
    familyRepo.getMembers(family.id).then((m) => {
      setMembers(m)
      setMembersLoaded(true)
    })
  }

  function toggleFixedDay(day: number) {
    setFixedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  async function handleSave() {
    const child = children.find((c) => c.id === selectedChildId)
    if (!child) return

    setLoading(true)
    try {
      let rules: RegimeRule[] = []
      const ruleId = 'rule-' + Date.now()

      if (regimeType === 'semanas_alternadas') {
        const weekBParentId = members.find((m) => m.userId !== weekAParentId)?.userId ?? weekAParentId
        rules = [{
          id: ruleId,
          regimeId: '',
          ruleType: 'semanas_alternadas',
          swapDay,
          swapTime: '18:00',
          weekAParentId,
          weekBParentId,
          referenceDate: format(new Date(), 'yyyy-MM-dd'),
        }]
      } else if (regimeType === 'dias_fixos') {
        rules = [{
          id: ruleId,
          regimeId: '',
          ruleType: 'dias_fixos',
          daysOfWeek: fixedDays,
          startTime: '09:00',
          endTime: '19:00',
          parentId: primaryParentId,
        }]
      } else {
        const visitingParentId = members.find((m) => m.userId !== primaryParentId)?.userId ?? primaryParentId
        rules = [{
          id: ruleId,
          regimeId: '',
          ruleType: 'custodia_principal',
          primaryParentId,
          visitingParentId,
          visitDays: _visitDays,
          overnight: false,
        }]
      }

      const regime = await regimeRepo.createRegime({
        childId: selectedChildId,
        familyId: family.id,
        regimeType,
        label: regimeTypeLabel(regimeType),
        effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
        primaryParentId,
        courtOrdered: family.courtOrdered,
        priority: 0,
        isActive: true,
        rules: rules.map((r) => ({ ...r, regimeId: '' })),
      })

      onDone(regime)
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  void members.find((m) => m.userId !== userId) // used later when invite step wires parent selection

  return (
    <div className="flex flex-col gap-4">
      {children.length > 1 && (
        <Select
          label="Filho/a"
          value={selectedChildId}
          onChange={(e) => setSelectedChildId(e.target.value)}
        >
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.fullName}</option>
          ))}
        </Select>
      )}

      {/* Regime type cards */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Tipo de regime</p>
        <div className="flex flex-col gap-2">
          {[
            { type: 'semanas_alternadas' as const, label: 'Semanas Alternadas', desc: 'Uma semana com cada pai, troca num dia fixo' },
            { type: 'dias_fixos' as const, label: 'Dias Fixos', desc: 'Dias específicos da semana com cada pai' },
            { type: 'custodia_principal' as const, label: 'Custódia Principal', desc: 'Principalmente com um pai, visitas regulares ao outro' },
          ].map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => setRegimeType(opt.type)}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors ${
                regimeType === opt.type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                regimeType === opt.type ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
              }`} />
              <div>
                <p className={`text-sm font-medium ${regimeType === opt.type ? 'text-blue-700' : 'text-gray-800'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Regime-specific config */}
      {regimeType === 'semanas_alternadas' && (
        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl">
          <Select
            label="Dia de troca"
            value={swapDay}
            onChange={(e) => setSwapDay(Number(e.target.value))}
          >
            {WEEK_DAYS_FULL.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </Select>
          <p className="text-xs text-gray-500">
            Semana A começa hoje ({format(new Date(), 'dd/MM/yyyy')}) — pode ajustar mais tarde.
          </p>
        </div>
      )}

      {regimeType === 'dias_fixos' && (
        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm font-medium text-gray-700">Dias com este responsável</p>
          <div className="flex gap-2 flex-wrap">
            {WEEK_DAYS.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleFixedDay(i)}
                className={`h-9 w-9 rounded-full text-sm font-medium transition-colors ${
                  fixedDays.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {regimeType === 'custodia_principal' && (
        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600">
            O filho/a fica principalmente consigo. Configure os dias de visita ao outro responsável depois de o convidar.
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Anterior
        </Button>
        <Button type="button" fullWidth loading={loading} onClick={handleSave}>
          Seguinte
        </Button>
      </div>
    </div>
  )
}

function regimeTypeLabel(type: RegimeType): string {
  const labels = {
    semanas_alternadas: 'Semanas Alternadas',
    dias_fixos: 'Dias Fixos',
    custodia_principal: 'Custódia Principal',
  }
  return labels[type]
}
