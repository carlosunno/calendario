import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { familyRepo, regimeRepo } from '@/lib/repository'
import { Card, CardHeader, CardTitle } from '@/ui/Card'
import { Avatar } from '@/ui/Avatar'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Input, Select } from '@/ui/Input'
import { showToast } from '@/ui/Toast'
import type { CustodyRegime } from '@/types/domain'
import { format } from 'date-fns'

const ROLE_LABELS: Record<string, string> = {
  pai: 'Pai', mae: 'Mãe', avo: 'Avó/Avô', cuidador: 'Cuidador',
}

const REGIME_TYPE_LABELS: Record<string, string> = {
  semanas_alternadas: 'Semanas Alternadas',
  dias_fixos: 'Dias Fixos',
  custodia_principal: 'Custódia Principal',
  personalizado: 'Personalizado',
}

export function FamilyPage() {
  const { activeFamily, activeFamilyMembers, children, setActiveFamily } = useAppStore()
  const { user } = useAuthStore()
  const [regimes, setRegimes] = useState<CustodyRegime[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'pai' | 'mae' | 'avo' | 'cuidador'>('mae')
  const [inviting, setInviting] = useState(false)
  const [tab, setTab] = useState<'membros' | 'filhos' | 'regimes'>('membros')
  const navigate = useNavigate()

  useEffect(() => {
    if (!activeFamily) return
    regimeRepo.getRegimes(activeFamily.id).then(setRegimes)
  }, [activeFamily])

  async function handleInvite() {
    if (!activeFamily || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await familyRepo.addMember({
        familyId: activeFamily.id,
        userId: 'pending-' + Date.now(),
        role: inviteRole,
        inviteStatus: 'pendente',
        color: '#6b7280',
        canApprove: true,
        canRequest: true,
        isViewOnly: false,
      })
      const members = await familyRepo.getMembers(activeFamily.id)
      setActiveFamily(activeFamily, members, children)
      setInviteEmail('')
      showToast(`Convite enviado para ${inviteEmail}`, 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setInviting(false)
    }
  }

  const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  function regimeSummary(regime: CustodyRegime): string {
    const rule = regime.rules[0]
    if (!rule) return REGIME_TYPE_LABELS[regime.regimeType]
    if (rule.ruleType === 'semanas_alternadas' && rule.swapDay !== undefined) {
      return `Semanas Alternadas · troca à ${WEEK_DAYS[rule.swapDay]}`
    }
    if (rule.ruleType === 'dias_fixos' && rule.daysOfWeek) {
      return `Dias Fixos · ${rule.daysOfWeek.map((d) => WEEK_DAYS[d]).join(', ')}`
    }
    return REGIME_TYPE_LABELS[regime.regimeType]
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-900">Família</h2>

      {activeFamily && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-gray-900">{activeFamily.name}</p>
              <p className="text-xs text-gray-500">
                {activeFamily.custodyType === 'partilhada' ? 'Custódia Partilhada' :
                 activeFamily.custodyType === 'principal_mae' ? 'Custódia Principal — Mãe' :
                 activeFamily.custodyType === 'principal_pai' ? 'Custódia Principal — Pai' : 'Outra'}
              </p>
            </div>
            {activeFamily.courtOrdered && <Badge variant="warning">Ordem judicial</Badge>}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Código da família <span className="text-gray-400">(partilhe com o outro responsável)</span></p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-100 rounded-lg px-3 py-2 font-mono text-gray-700 break-all">
                {activeFamily.id}
              </code>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(activeFamily.id); showToast('Código copiado.', 'success') }}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
                title="Copiar código"
              >
                <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['membros', 'filhos', 'regimes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Membros */}
      {tab === 'membros' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {activeFamilyMembers.map((member) => (
              <Card key={member.id}>
                <div className="flex items-center gap-3">
                  <Avatar name={member.profile.displayName} color={member.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {member.profile.displayName}
                      {member.userId === user?.id && (
                        <span className="text-xs text-blue-600 ml-1">(eu)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{member.profile.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge>{ROLE_LABELS[member.role] ?? member.role}</Badge>
                    {member.inviteStatus === 'pendente' && (
                      <Badge variant="warning">Pendente</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Invite */}
          <Card>
            <CardHeader>
              <CardTitle>Convidar responsável</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-3">
              <Input
                type="email"
                label="Email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select label="Papel" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}>
                <option value="mae">Mãe</option>
                <option value="pai">Pai</option>
                <option value="avo">Avó/Avô</option>
                <option value="cuidador">Cuidador</option>
              </Select>
              <Button onClick={handleInvite} loading={inviting} disabled={!inviteEmail.trim()}>
                Enviar convite
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Filhos */}
      {tab === 'filhos' && (
        <div className="flex flex-col gap-3">
          {children.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Nenhum filho configurado.</p>
          ) : (
            children.map((child) => (
              <Card key={child.id}>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: child.color }}
                  >
                    {child.fullName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{child.fullName}</p>
                    {child.dateOfBirth && (
                      <p className="text-xs text-gray-500">
                        Nasceu em {format(new Date(child.dateOfBirth + 'T12:00:00'), 'dd/MM/yyyy')}
                      </p>
                    )}
                    {child.schoolName && (
                      <p className="text-xs text-gray-500">🏫 {child.schoolName}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Regimes */}
      {tab === 'regimes' && (
        <div className="flex flex-col gap-3">
          {regimes.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Nenhum regime configurado.</p>
          ) : (
            regimes.map((regime) => {
              const child = children.find((c) => c.id === regime.childId)
              return (
                <Card key={regime.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{regime.label}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{regimeSummary(regime)}</p>
                      {child && (
                        <span
                          className="inline-block mt-1 text-xs text-white px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: child.color }}
                        >
                          {child.fullName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {regime.isActive ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="neutral">Inactivo</Badge>
                      )}
                      {regime.courtOrdered && <Badge variant="warning">Tribunal</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Desde {format(new Date(regime.effectiveFrom + 'T12:00:00'), 'dd/MM/yyyy')}
                    {regime.effectiveUntil && ` até ${format(new Date(regime.effectiveUntil + 'T12:00:00'), 'dd/MM/yyyy')}`}
                  </p>
                  {regime.isActive && (
                    <button
                      type="button"
                      onClick={() => navigate(`/family/regimes/${regime.id}/actualizar`)}
                      className="mt-2 text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors"
                    >
                      Actualizar regime →
                    </button>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
