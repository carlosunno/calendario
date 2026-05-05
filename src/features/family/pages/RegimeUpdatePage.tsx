import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { regimeRepo, familyRepo } from '@/lib/repository'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/ui/Button'
import { Select } from '@/ui/Input'
import { showToast } from '@/ui/Toast'
import type { CustodyRegime, FamilyMember, RegimeRule } from '@/types/domain'
import { format, addDays, parseISO } from 'date-fns'

function mostRecentSwapDate(swapDay: number, fromDate: Date): string {
  const daysBack = (fromDate.getDay() - swapDay + 7) % 7
  return format(addDays(fromDate, -daysBack), 'yyyy-MM-dd')
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const WEEK_DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

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

export function RegimeUpdatePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeFamily, children } = useAppStore()
  const { user } = useAuthStore()

  const [oldRegime, setOldRegime] = useState<CustodyRegime | null>(null)
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // New regime config
  const [effectiveFrom, setEffectiveFrom] = useState(
    format(addDays(new Date(), 1), 'yyyy-MM-dd')
  )
  const [regimeType, setRegimeType] = useState<RegimeType>('semanas_alternadas')
  const [swapDay, setSwapDay] = useState(5)
  const [fixedDays, setFixedDays] = useState<number[]>([])
  const [hasMixedDays, setHasMixedDays] = useState(false)
  const [myFixedDays, setMyFixedDays] = useState<number[]>([])
  const [otherFixedDays, setOtherFixedDays] = useState<number[]>([])

  useEffect(() => {
    if (!id || !activeFamily) return
    Promise.all([
      regimeRepo.getRegime(id),
      familyRepo.getMembers(activeFamily.id),
    ]).then(([regime, m]) => {
      if (!regime) { navigate('/family'); return }
      setOldRegime(regime)
      setMembers(m)
      // Pre-fill with current regime values
      setRegimeType(regime.regimeType as RegimeType)
      const altRule = regime.rules.find((r) => r.ruleType === 'semanas_alternadas')
      if (altRule?.swapDay !== undefined) setSwapDay(altRule.swapDay)
      const fixedRules = regime.rules.filter((r) => r.ruleType === 'dias_fixos')
      if (fixedRules.length > 0 && regime.regimeType === 'semanas_alternadas') {
        setHasMixedDays(true)
        const myRule = fixedRules.find((r) => r.parentId === user?.id)
        const otherRule = fixedRules.find((r) => r.parentId !== user?.id)
        if (myRule?.daysOfWeek) setMyFixedDays(myRule.daysOfWeek)
        if (otherRule?.daysOfWeek) setOtherFixedDays(otherRule.daysOfWeek)
      } else if (regime.regimeType === 'dias_fixos') {
        const rule = fixedRules[0]
        if (rule?.daysOfWeek) setFixedDays(rule.daysOfWeek)
      }
      setLoading(false)
    })
  }, [id, activeFamily, navigate, user?.id])

  const otherMember = members.find((m) => m.userId !== user?.id)
  const myName = members.find((m) => m.userId === user?.id)?.profile.displayName ?? 'Eu'
  const otherName = otherMember?.profile.displayName ?? 'Outro responsável'
  const myColor = members.find((m) => m.userId === user?.id)?.color ?? '#3b82f6'
  const otherColor = otherMember?.color ?? '#f59e0b'

  function toggleMyDay(day: number) {
    setMyFixedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
    setOtherFixedDays((prev) => prev.filter((d) => d !== day))
  }

  function toggleOtherDay(day: number) {
    setOtherFixedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
    setMyFixedDays((prev) => prev.filter((d) => d !== day))
  }

  function toggleFixedDay(day: number) {
    setFixedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  async function handleSave() {
    if (!oldRegime || !user || !activeFamily) return

    const newFrom = parseISO(effectiveFrom)
    if (newFrom <= parseISO(oldRegime.effectiveFrom)) {
      showToast('A nova data de início deve ser posterior ao início do regime actual.', 'error')
      return
    }

    setSaving(true)
    try {
      // Set effectiveUntil on the old regime (day before new start)
      const until = format(addDays(newFrom, -1), 'yyyy-MM-dd')
      await regimeRepo.updateRegime(oldRegime.id, { effectiveUntil: until, isActive: false })

      // Build rules for new regime
      const rules: RegimeRule[] = []
      const ts = Date.now()

      if (regimeType === 'semanas_alternadas') {
        const weekBParentId = otherMember?.userId ?? user.id
        rules.push({
          id: `rule-alt-${ts}`,
          regimeId: '',
          ruleType: 'semanas_alternadas',
          swapDay,
          swapTime: '18:00',
          weekAParentId: user.id,
          weekBParentId,
          referenceDate: mostRecentSwapDate(swapDay, parseISO(effectiveFrom)),
        })
        if (hasMixedDays) {
          if (myFixedDays.length > 0) {
            rules.push({ id: `rule-fixed-me-${ts}`, regimeId: '', ruleType: 'dias_fixos', daysOfWeek: myFixedDays, parentId: user.id })
          }
          if (otherFixedDays.length > 0) {
            rules.push({ id: `rule-fixed-other-${ts}`, regimeId: '', ruleType: 'dias_fixos', daysOfWeek: otherFixedDays, parentId: otherMember?.userId ?? user.id })
          }
        }
      } else if (regimeType === 'dias_fixos') {
        rules.push({ id: `rule-fixed-${ts}`, regimeId: '', ruleType: 'dias_fixos', daysOfWeek: fixedDays, startTime: '09:00', endTime: '19:00', parentId: user.id })
      } else {
        rules.push({ id: `rule-sole-${ts}`, regimeId: '', ruleType: 'custodia_principal', primaryParentId: user.id, visitingParentId: otherMember?.userId ?? user.id, visitDays: [], overnight: false })
      }

      const label =
        hasMixedDays && regimeType === 'semanas_alternadas' && (myFixedDays.length > 0 || otherFixedDays.length > 0)
          ? 'Semanas Alternadas + Dias Fixos'
          : regimeTypeLabel(regimeType)

      await regimeRepo.createRegime({
        childId: oldRegime.childId,
        familyId: activeFamily.id,
        regimeType,
        label,
        effectiveFrom,
        primaryParentId: user.id,
        courtOrdered: oldRegime.courtOrdered,
        priority: oldRegime.priority,
        isActive: true,
        rules,
      })

      showToast('Novo regime criado com sucesso.', 'success')
      navigate('/family')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">A carregar...</p>
      </div>
    )
  }

  if (!oldRegime) return null

  const child = children.find((c) => c.id === oldRegime.childId)

  return (
    <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/family')}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900">Actualizar regime</h2>
      </div>

      {/* Current regime summary */}
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Regime actual</p>
        <p className="text-sm font-medium text-gray-800">{oldRegime.label}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Desde {format(parseISO(oldRegime.effectiveFrom + 'T12:00:00'), 'dd/MM/yyyy')}
          {child && (
            <span
              className="inline-block ml-2 px-2 py-0.5 rounded-full text-white text-xs font-medium"
              style={{ backgroundColor: child.color }}
            >
              {child.fullName}
            </span>
          )}
        </p>
      </div>

      {/* New effective date */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Novo regime entra em vigor a partir de
        </label>
        <input
          type="date"
          value={effectiveFrom}
          min={format(addDays(parseISO(oldRegime.effectiveFrom), 1), 'yyyy-MM-dd')}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500">
          O regime actual ficará registado como histórico até {effectiveFrom
            ? format(addDays(parseISO(effectiveFrom), -1), 'dd/MM/yyyy')
            : '—'}.
        </p>
      </div>

      {/* Regime type */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Novo regime base</p>
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
                <p className={`text-sm font-medium ${regimeType === opt.type ? 'text-blue-700' : 'text-gray-800'}`}>{opt.label}</p>
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
            A contagem de semanas reinicia a partir de {effectiveFrom ? format(parseISO(effectiveFrom + 'T12:00:00'), 'dd/MM/yyyy') : '—'}.
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

      {/* Primary custody info */}
      {regimeType === 'custodia_principal' && (
        <div className="p-4 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600">
            O filho/a fica principalmente consigo. Configure os dias de visita nas excepções.
          </p>
        </div>
      )}

      {/* Mixed days overlay */}
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
            <div className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${hasMixedDays ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${hasMixedDays ? 'translate-x-4' : 'translate-x-0'}`} />
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

      <Button type="button" fullWidth loading={saving} onClick={handleSave}>
        Guardar novo regime
      </Button>
    </div>
  )
}

function regimeTypeLabel(type: RegimeType): string {
  return { semanas_alternadas: 'Semanas Alternadas', dias_fixos: 'Dias Fixos', custodia_principal: 'Custódia Principal' }[type]
}
