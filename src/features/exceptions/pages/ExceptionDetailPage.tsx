import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { exceptionRepo } from '@/lib/repository'
import { Card } from '@/ui/Card'
import { StatusBadge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Textarea } from '@/ui/Input'
import { showToast } from '@/ui/Toast'
import type { AuditLogEntry, ExceptionRequest } from '@/types/domain'

export function ExceptionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { children, activeFamilyMembers } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [exception, setException] = useState<ExceptionRequest | null>(null)
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      exceptionRepo.getException(id),
      exceptionRepo.getAuditLog(id),
    ]).then(([exc, log]) => {
      setException(exc)
      setAuditLog(log)
    })
  }, [id])

  if (!exception) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const child = children.find((c) => c.id === exception.childId)
  const requester = activeFamilyMembers.find((m) => m.userId === exception.requestedBy)
  const canRespond = exception.status === 'pendente' && exception.requestedBy !== user?.id
  const canCancel = exception.status === 'pendente' && exception.requestedBy === user?.id

  async function handleApprove() {
    if (!exception || !user) return
    setLoading(true)
    try {
      const updated = await exceptionRepo.updateException(exception.id, {
        status: 'aprovado',
        respondedBy: user.id,
        respondedAt: new Date().toISOString(),
      })
      await exceptionRepo.addAuditEntry({
        exceptionId: exception.id,
        actorId: user.id,
        action: 'aprovado',
        previousState: { status: exception.status },
        newState: { status: 'aprovado' },
        createdAt: new Date().toISOString(),
      })
      setException(updated)
      const log = await exceptionRepo.getAuditLog(exception.id)
      setAuditLog(log)
      showToast('Pedido aprovado', 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!exception || !user || !rejectReason.trim()) return
    setLoading(true)
    try {
      const updated = await exceptionRepo.updateException(exception.id, {
        status: 'rejeitado',
        respondedBy: user.id,
        respondedAt: new Date().toISOString(),
        rejectionReason: rejectReason,
      })
      await exceptionRepo.addAuditEntry({
        exceptionId: exception.id,
        actorId: user.id,
        action: 'rejeitado',
        previousState: { status: exception.status },
        newState: { status: 'rejeitado', rejectionReason: rejectReason },
        createdAt: new Date().toISOString(),
      })
      setException(updated)
      const log = await exceptionRepo.getAuditLog(exception.id)
      setAuditLog(log)
      setShowRejectForm(false)
      showToast('Pedido rejeitado', 'info')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!exception || !user) return
    setLoading(true)
    try {
      const updated = await exceptionRepo.updateException(exception.id, { status: 'cancelado' })
      await exceptionRepo.addAuditEntry({
        exceptionId: exception.id,
        actorId: user.id,
        action: 'cancelado',
        previousState: { status: exception.status },
        newState: { status: 'cancelado' },
        createdAt: new Date().toISOString(),
      })
      setException(updated)
      const log = await exceptionRepo.getAuditLog(exception.id)
      setAuditLog(log)
      showToast('Pedido cancelado', 'info')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900">{exceptionTypeLabel(exception.exceptionType)}</h2>
          <StatusBadge status={exception.status} />
        </div>
        {exception.isUrgent && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Urgente</span>
        )}
      </div>

      {/* Details */}
      <Card>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Filho/a</dt>
            <dd className="font-medium text-gray-900">{child?.fullName ?? 'Desconhecido'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Pedido por</dt>
            <dd className="font-medium text-gray-900">{requester?.profile.displayName ?? 'Desconhecido'}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 mb-0.5">Data original</dt>
            <dd className="font-medium text-gray-900">
              {format(new Date(exception.originalDate + 'T12:00:00'), 'dd/MM/yyyy')}
              {exception.originalEndDate && ` → ${format(new Date(exception.originalEndDate + 'T12:00:00'), 'dd/MM/yyyy')}`}
            </dd>
          </div>
          {exception.proposedDate && (
            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Data proposta</dt>
              <dd className="font-medium text-gray-900">
                {format(new Date(exception.proposedDate + 'T12:00:00'), 'dd/MM/yyyy')}
              </dd>
            </div>
          )}
          <div className="col-span-2">
            <dt className="text-xs text-gray-500 mb-0.5">Motivo</dt>
            <dd className="text-gray-800">{exception.reason ?? '—'}</dd>
          </div>
          {exception.rejectionReason && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-500 mb-0.5">Motivo da rejeição</dt>
              <dd className="text-red-700">{exception.rejectionReason}</dd>
            </div>
          )}
        </dl>
      </Card>

      {/* Actions */}
      {canRespond && !showRejectForm && (
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => setShowRejectForm(true)} className="flex-1">
            Rejeitar
          </Button>
          <Button onClick={handleApprove} loading={loading} className="flex-1">
            Aprovar
          </Button>
        </div>
      )}

      {showRejectForm && (
        <Card>
          <p className="text-sm font-medium text-gray-700 mb-2">Motivo da rejeição</p>
          <Textarea
            placeholder="Explique o motivo..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={() => setShowRejectForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              loading={loading}
              disabled={!rejectReason.trim()}
              className="flex-1"
            >
              Confirmar rejeição
            </Button>
          </div>
        </Card>
      )}

      {canCancel && (
        <Button variant="ghost" onClick={handleCancel} loading={loading}>
          Cancelar pedido
        </Button>
      )}

      {/* Audit log */}
      {auditLog.length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-gray-700 mb-3">Histórico</p>
          <div className="relative">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="flex flex-col gap-4">
              {auditLog.map((entry) => {
                const actor = activeFamilyMembers.find((m) => m.userId === entry.actorId)
                return (
                  <div key={entry.id} className="flex gap-3 pl-6 relative">
                    <div className="absolute left-0 top-1 h-4 w-4 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                      <div className={`h-1.5 w-1.5 rounded-full ${actionColor(entry.action)}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">
                        <strong>{actor?.profile.displayName ?? 'Sistema'}</strong>{' '}
                        {actionLabel(entry.action)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function exceptionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    troca_dia: 'Troca de dia', extensao_tempo: 'Extensão de tempo', ferias: 'Férias',
    emergencia: 'Emergência', compensacao: 'Compensação', ocasiao_especial: 'Ocasião especial',
    marcacao_ferias: 'Marcação de férias',
  }
  return labels[type] ?? type
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    criado: 'criou este pedido', aprovado: 'aprovou este pedido',
    rejeitado: 'rejeitou este pedido', cancelado: 'cancelou este pedido',
    expirado: 'pedido expirado automaticamente',
  }
  return labels[action] ?? action
}

function actionColor(action: string): string {
  const colors: Record<string, string> = {
    criado: 'bg-blue-500', aprovado: 'bg-green-500',
    rejeitado: 'bg-red-500', cancelado: 'bg-gray-400', expirado: 'bg-gray-400',
  }
  return colors[action] ?? 'bg-gray-400'
}
