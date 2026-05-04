import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { regimeRepo, exceptionRepo } from '@/lib/repository'
import { getParentForDate } from '@/lib/schedule/computeSchedule'
import { Card, CardHeader, CardTitle } from '@/ui/Card'
import { Badge, StatusBadge } from '@/ui/Badge'
import { Avatar } from '@/ui/Avatar'
import type { CustodyRegime, ExceptionRequest } from '@/types/domain'

export function DashboardPage() {
  const { activeFamily, activeFamilyMembers, children } = useAppStore()
  const { user } = useAuthStore()
  const [regimes, setRegimes] = useState<CustodyRegime[]>([])
  const [pendingExceptions, setPendingExceptions] = useState<ExceptionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date()

  useEffect(() => {
    if (!activeFamily) return
    Promise.all([
      regimeRepo.getRegimes(activeFamily.id),
      exceptionRepo.getExceptions(activeFamily.id),
    ]).then(([r, e]) => {
      setRegimes(r)
      setPendingExceptions(e.filter((ex) => ex.status === 'pendente'))
      setLoading(false)
    })
  }, [activeFamily])

  function getParentName(parentId: string) {
    const member = activeFamilyMembers.find((m) => m.userId === parentId)
    return member?.profile.displayName ?? 'Desconhecido'
  }

  function getParentColor(parentId: string) {
    const member = activeFamilyMembers.find((m) => m.userId === parentId)
    return member?.color ?? '#6b7280'
  }

  function getNextExchangeInfo(childId: string) {
    for (let i = 1; i <= 14; i++) {
      const date = addDays(today, i)
      const parentToday = getParentForDate(today, regimes, childId, [])
      const parentFuture = getParentForDate(date, regimes, childId, [])
      if (parentToday && parentFuture && parentToday !== parentFuture) {
        return { date, days: i }
      }
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Date header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
            {format(today, 'EEEE', { locale: ptBR })}
          </p>
          <h2 className="text-xl font-bold text-gray-900">
            {format(today, "d 'de' MMMM", { locale: ptBR })}
          </h2>
        </div>
        {activeFamily?.courtOrdered && (
          <Badge variant="warning">Ordem judicial</Badge>
        )}
      </div>

      {/* Today's status per child */}
      {children.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhum filho configurado.{' '}
            <Link to="/family" className="text-blue-600 font-medium">Configurar família</Link>
          </p>
        </Card>
      ) : (
        children.map((child) => {
          const parentId = getParentForDate(today, regimes, child.id, pendingExceptions)
          const nextExchange = getNextExchangeInfo(child.id)
          const isWithMe = parentId === user?.id

          return (
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
                  {parentId ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-500">Hoje está com</span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: getParentColor(parentId) }}
                      >
                        {isWithMe ? 'si' : getParentName(parentId)}
                      </span>
                      {isWithMe && (
                        <Badge variant="success">Consigo</Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">Regime não configurado</p>
                  )}
                </div>
                {parentId && (
                  <Avatar
                    name={getParentName(parentId)}
                    color={getParentColor(parentId)}
                    size="sm"
                  />
                )}
              </div>

              {nextExchange && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="text-xs text-gray-600">
                      Próxima troca{' '}
                      {nextExchange.days === 1 ? 'amanhã' : `em ${nextExchange.days} dias`}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {format(nextExchange.date, 'dd/MM')}
                  </span>
                </div>
              )}
            </Card>
          )
        })
      )}

      {/* Pending exceptions */}
      {pendingExceptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Pendentes</CardTitle>
            <Badge variant="warning">{pendingExceptions.length}</Badge>
          </CardHeader>
          <div className="flex flex-col gap-2">
            {pendingExceptions.slice(0, 3).map((exc) => {
              const child = children.find((c) => c.id === exc.childId)
              const requester = activeFamilyMembers.find((m) => m.userId === exc.requestedBy)
              return (
                <Link
                  key={exc.id}
                  to={`/exceptions/${exc.id}`}
                  className="flex items-center justify-between p-2 bg-amber-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {exceptionTypeLabel(exc.exceptionType)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {child?.fullName} · {requester?.profile.displayName}
                    </p>
                  </div>
                  <StatusBadge status={exc.status} />
                </Link>
              )
            })}
            {pendingExceptions.length > 3 && (
              <Link to="/exceptions" className="text-xs text-blue-600 text-center font-medium py-1">
                Ver todos ({pendingExceptions.length})
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/calendar">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">Calendário</p>
            </div>
          </Card>
        </Link>
        <Link to="/exceptions/new">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">Pedir Troca</p>
            </div>
          </Card>
        </Link>
        <Link to="/notes/new">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">Nova Nota</p>
            </div>
          </Card>
        </Link>
        <Link to="/vacations/new">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-gray-700">Férias</p>
            </div>
          </Card>
        </Link>
      </div>
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
