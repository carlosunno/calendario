import { useState } from 'react'
import { regimeRepo, familyRepo } from '@/lib/repository'
import { Button } from '@/ui/Button'
import { Select } from '@/ui/Input'
import type { Child, CustodyRegime, Family, FamilyMember, RegimeRule } from '@/types/domain'
import { showToast } from '@/ui/Toast'
import { format, addDays } from 'date-fns'

function mostRecentSwapDate(swapDay: number, fromDate: Date): string {
  const daysBack = (fromDate.getDay() - swapDay + 7) % 7
  return format(addDays(fromDate, -daysBack), 'yyyy-MM-dd')
}

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

function DayPicker({
  label,
  selected,
  disabled,
  color,
  onToggle,
}: {
  label: string
  selected: number[]
  disabled: number[]
  color: string
  onToggle: (day: number) => void
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
      <div className="flex gap-1.5 flex-wrap">
        {WEEK_DAYS.map((d, i) => {
          const isSelected = selected.includes(i)
          const isDisabled = disabled.includes(i)
          return (
            <button
              key={i}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggle(i)}
              className={`h-9 w-9 rounded-full text-xs font-semibold transition-colors ${
                isSelected
                  ? 'text-white'
                  : isDisabled
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              style={isSelected ? { backgroundColor: color } : {}}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function RegimeStep({ family, children, userId, onDone, onBack }: RegimeStepProps) {
  const [regimeType, setRegimeType] = useState<RegimeType>('semanas_alternadas')
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? '')
  const [swapDay, setSwapDay] = useState(5) // Friday
  const [weekAParentId] = useState(userId)
  const [fixedDays, setFixedDays] = useState<number[]>([])
  const [primaryParentId] = useState(userId)

  // Mixed regime: fixed day overrides on top of alternating weeks
  const [hasMixedDays, setHasMixedDays] = useState(false)
  const [myFixedDays, setMyFixedDays] = useState<number[]>([])
  const [otherFixedDays, setOtherFixedDays] = useState<number[]>([])

  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(false)
  const [membersLoaded, setMembersLoaded] = useState(false)

  if (!membersLoaded) {
    familyRepo.getMembers(family.id).then((m) => {
      setMembers(m)
      setMembersLoaded(true)
    })
  }

  const otherMember = members.find((m) => m.userId !== userId)
  const myName = members.find((m) => m.userId === userId)?.profile.displayName ?? 'Eu'
  const otherName = otherMember?.profile.displayName ?? 'Outro responsável'
  const myColor = members.find((m) => m.userId === userId)?.color ?? '#3b82f6'
  const otherColor = otherMember?.color ?? '#f59e0b'

  function toggleMyDay(day: number) {
    setMyFixedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
    // Remove from other side if already there
    setOtherFixedDays((prev) => prev.filter((d) => d !== day))
  }

  function toggleOtherDay(day: number) {
    setOtherFixedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
    setMyFixedDays((prev) => prev.filter((d) => d !== day))
  }

  function toggleFixedDay(day: number) {
    setFixedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  async function handleSave() {
    const child = children.find((c) => c.id === selectedChildId)
    if (!child) return

    setLoading(true)
    try {
      const rules: RegimeRule[] = []
      const ts = Date.now()

      if (regimeType === 'semanas_alternadas') {
        const weekBParentId = otherMember?.userId ?? weekAParentId
        rules.push({
          id: `rule-alt-${ts}`,
          regimeId: '',
          ruleType: 'semanas_alternadas',
          swapDay,
          swapTime: '18:00',
          weekAParentId,
          weekBParentId,
          referenceDate: mostRecentSwapDate(swapDay, new Date()),
        })

        // Add fixed day overrides if configured
        if (hasMixedDays) {
          if (myFixedDays.length > 0) {
            rules.push({
              id: `rule-fixed-me-${ts}`,
              regimeId: '',
              ruleType: 'dias_fixos',
              daysOfWeek: myFixedDays,
              parentId: userId,
            })
          }
          if (otherFixedDays.length > 0) {
            rules.push({
              id: `rule-fixed-other-${ts}`,
              regimeId: '',
              ruleType: 'dias_fixos',
              daysOfWeek: otherFixedDays,
              parentId: otherMember?.userId ?? userId,
            })
          }
        }
      } else if (regimeType === 'dias_fixos') {
        rules.push({
          id: `rule-fixed-${ts}`,
          regimeId: '',
          ruleType: 'dias_fixos',
          daysOfWeek: fixedDays,
          startTime: '09:00',
          endTime: '19:00',
          parentId: primaryParentId,
        })
      } else {
        const visitingParentId = otherMember?.userId ?? primaryParentId
        rules.push({
          id: `rule-sole-${ts}`,
          regimeId: '',
          ruleType: 'custodia_principal',
          primaryParentId,
          visitingParentId,
          visitDays: [],
          overnight: false,
        })
      }

      const label =
        hasMixedDays && regimeType === 'semanas_alternadas' && (myFixedDays.length > 0 || otherFixedDays.length > 0)
          ? 'Semanas Alternadas + Dias Fixos'
          : regimeTypeLabel(regimeType)

      const regime = await regimeRepo.createRegime({
        childId: selectedChildId,
        familyId: family.id,
        regimeType,
        label,
        effectiveFrom: format(new Date(), 'yyyy-MM-dd'),
        primaryParentId,
        courtOrdered: family.courtOrdered,
        priority: 0,
        isActive: true,
        rules,
      })

      onDone(regime)
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

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
        <p className="text-sm font-medium text-gray-700 mb-2">Regime base</p>
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

      {/* Alternating weeks config */}
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
            A semana actual começa hoje ({format(new Date(), 'dd/MM/yyyy')}).
          </p>
        </div>
      )}

      {/* Fixed days config */}
      {regimeType === 'dias_fixos' && (
        <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl">
          <p className="text-sm font-medium text-gray-700">Dias consigo</p>
          <div className="flex gap-2 flex-wrap">
            {WEEK_DAYS.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleFixedDay(i)}
                className={`h-9 w-9 rounded-full text-xs font-semibold transition-colors ${
                  fixedDays.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Primary custody */}
      {regimeType === 'custodia_principal' && (
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600">
            O filho/a fica principalmente consigo. Configure os dias de visita depois de convidar o outro responsável.
          </p>
        </div>
      )}

      {/* Mixed days overlay — only for alternating weeks */}
      {regimeType === 'semanas_alternadas' && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setHasMixedDays((v) => !v)}
            className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
              hasMixedDays ? 'bg-indigo-50' : 'hover:bg-gray-50'
            }`}
          >
            <div>
              <p className={`text-sm font-medium ${hasMixedDays ? 'text-indigo-700' : 'text-gray-700'}`}>
                Adicionar dias fixos sobre o regime
              </p>
              <p className="text-xs text-gray-500">
                Ex: terças sempre contigo, quartas sempre com o outro responsável
              </p>
            </div>
            <div className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${
              hasMixedDays ? 'bg-indigo-600' : 'bg-gray-300'
            }`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
                hasMixedDays ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </div>
          </button>

          {hasMixedDays && (
            <div className="p-4 border-t border-gray-100 flex flex-col gap-4">
              <DayPicker
                label={`Dias fixos com ${myName}`}
                selected={myFixedDays}
                disabled={otherFixedDays}
                color={myColor}
                onToggle={toggleMyDay}
              />
              <DayPicker
                label={`Dias fixos com ${otherName}`}
                selected={otherFixedDays}
                disabled={myFixedDays}
                color={otherColor}
                onToggle={toggleOtherDay}
              />

              {(myFixedDays.length > 0 || otherFixedDays.length > 0) && (
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <p className="text-xs text-indigo-700 font-medium">Resumo:</p>
                  {myFixedDays.length > 0 && (
                    <p className="text-xs text-indigo-600">
                      {myFixedDays.map((d) => WEEK_DAYS_FULL[d]).join(', ')} — sempre com {myName}
                    </p>
                  )}
                  {otherFixedDays.length > 0 && (
                    <p className="text-xs text-indigo-600">
                      {otherFixedDays.map((d) => WEEK_DAYS_FULL[d]).join(', ')} — sempre com {otherName}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
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
