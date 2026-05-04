import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { vacationRepo } from '@/lib/repository'
import { Card } from '@/ui/Card'
import { StatusBadge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import { showToast } from '@/ui/Toast'
import type { VacationPeriod } from '@/types/domain'

const VACATION_TYPE_LABELS: Record<string, string> = {
  ferias_escolares: '🏫 Férias Escolares',
  ferias_pessoais: '🌴 Férias Pessoais',
  verao: '☀️ Verão',
  natal: '🎄 Natal',
  pascoa: '🐣 Páscoa',
}

export function VacationsPage() {
  const { activeFamily, children, activeFamilyMembers } = useAppStore()
  const { user } = useAuthStore()
  const [vacations, setVacations] = useState<VacationPeriod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeFamily) return
    vacationRepo.getVacations(activeFamily.id).then((v) => { setVacations(v); setLoading(false) })
  }, [activeFamily])

  async function handleApprove(vac: VacationPeriod) {
    try {
      const updated = await vacationRepo.updateVacation(vac.id, { status: 'aprovado' })
      setVacations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
      showToast('Férias aprovadas', 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function handleReject(vac: VacationPeriod) {
    try {
      const updated = await vacationRepo.updateVacation(vac.id, { status: 'rejeitado' })
      setVacations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
      showToast('Férias rejeitadas', 'info')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Férias</h2>
        <Link to="/vacations/new"><Button size="sm">+ Novas</Button></Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : vacations.length === 0 ? (
        <EmptyState
          title="Sem períodos de férias"
          description="Marque férias para que ambos os responsáveis sejam informados."
          action={<Link to="/vacations/new"><Button size="sm">Marcar férias</Button></Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {vacations.map((vac) => {
            const child = children.find((c) => c.id === vac.childId)
            const requester = activeFamilyMembers.find((m) => m.userId === vac.requestedBy)
            const canRespond = vac.status === 'pendente' && vac.requestedBy !== user?.id

            return (
              <Card key={vac.id}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {VACATION_TYPE_LABELS[vac.vacationType] ?? vac.vacationType}
                    </p>
                    <p className="text-sm text-gray-800">{vac.label}</p>
                  </div>
                  <StatusBadge status={vac.status} />
                </div>

                <div className="text-xs text-gray-600 space-y-0.5">
                  <p>
                    {format(new Date(vac.startDate + 'T12:00:00'), 'dd/MM/yyyy')} →{' '}
                    {format(new Date(vac.endDate + 'T12:00:00'), 'dd/MM/yyyy')}
                  </p>
                  {child && <p>Filho/a: {child.fullName}</p>}
                  {requester && <p>Pedido por: {requester.profile.displayName}</p>}
                  {vac.affectsCustody && (
                    <p className="text-amber-600 font-medium">Afecta custódia</p>
                  )}
                </div>

                {canRespond && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="danger" onClick={() => handleReject(vac)} className="flex-1">
                      Rejeitar
                    </Button>
                    <Button size="sm" onClick={() => handleApprove(vac)} className="flex-1">
                      Aprovar
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
