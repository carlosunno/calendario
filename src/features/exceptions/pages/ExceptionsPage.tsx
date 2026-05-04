import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { exceptionRepo } from '@/lib/repository'
import { Card } from '@/ui/Card'
import { StatusBadge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import type { ExceptionRequest } from '@/types/domain'

type FilterStatus = 'todos' | 'pendente' | 'aprovado' | 'rejeitado'

export function ExceptionsPage() {
  const { activeFamily, children, activeFamilyMembers } = useAppStore()
  const [exceptions, setExceptions] = useState<ExceptionRequest[]>([])
  const [filter, setFilter] = useState<FilterStatus>('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeFamily) return
    exceptionRepo.getExceptions(activeFamily.id).then((e) => {
      setExceptions(e)
      setLoading(false)
    })
  }, [activeFamily])

  const filtered = filter === 'todos' ? exceptions : exceptions.filter((e) => e.status === filter)

  function getChildName(childId: string) {
    return children.find((c) => c.id === childId)?.fullName ?? 'Desconhecido'
  }

  function getRequesterName(userId: string) {
    return activeFamilyMembers.find((m) => m.userId === userId)?.profile.displayName ?? 'Desconhecido'
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Pedidos de Alteração</h2>
        <Link to="/exceptions/new">
          <Button size="sm">+ Novo</Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['todos', 'pendente', 'aprovado', 'rejeitado'] as FilterStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors capitalize ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sem pedidos"
          description="Nenhum pedido de alteração encontrado."
          action={
            <Link to="/exceptions/new">
              <Button size="sm">Criar pedido</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((exc) => (
            <Link key={exc.id} to={`/exceptions/${exc.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {exceptionTypeLabel(exc.exceptionType)}
                      </span>
                      {exc.isUrgent && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                          Urgente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {getChildName(exc.childId)} · {format(new Date(exc.originalDate + 'T12:00:00'), 'dd/MM/yyyy')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pedido por {getRequesterName(exc.requestedBy)}
                    </p>
                    {exc.reason && (
                      <p className="text-xs text-gray-600 mt-1 truncate">{exc.reason}</p>
                    )}
                  </div>
                  <StatusBadge status={exc.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function exceptionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    troca_dia: 'Troca de dia',
    extensao_tempo: 'Extensão de tempo',
    ferias: 'Férias',
    emergencia: 'Emergência',
    compensacao: 'Compensação',
    ocasiao_especial: 'Ocasião especial',
    marcacao_ferias: 'Marcação de férias',
  }
  return labels[type] ?? type
}
