import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { expenseRepo } from '@/lib/repository'
import { Card } from '@/ui/Card'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import type { Expense } from '@/types/domain'

type FilterType = 'todas' | 'pendentes' | 'minhas' | 'partilhadas'

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente', paga: 'Paga', aguarda_confirmacao: 'A aguardar',
  confirmada: 'Confirmada', disputada: 'Disputada',
}
const STATUS_VARIANTS: Record<string, 'neutral' | 'warning' | 'success' | 'danger'> = {
  pendente: 'warning', paga: 'neutral', aguarda_confirmacao: 'warning',
  confirmada: 'success', disputada: 'danger',
}
const CATEGORY_LABELS: Record<string, string> = {
  saude: '🏥 Saúde', escola: '🏫 Escola', desporto: '⚽ Desporto',
  alimentacao: '🍽 Alimentação', vestuario: '👕 Vestuário', lazer: '🎡 Lazer', outro: '📦 Outro',
}

export function ExpensesPage() {
  const { activeFamily, activeFamilyMembers, children } = useAppStore()
  const { user } = useAuthStore()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filter, setFilter] = useState<FilterType>('todas')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeFamily) return
    expenseRepo.getExpenses(activeFamily.id).then((e) => {
      setExpenses(e)
      setLoading(false)
    })
  }, [activeFamily])

  function getParentName(id: string) {
    return activeFamilyMembers.find((m) => m.userId === id)?.profile.displayName ?? 'Desconhecido'
  }

  const filtered = expenses.filter((e) => {
    if (filter === 'pendentes') return e.status === 'pendente' || e.status === 'aguarda_confirmacao'
    if (filter === 'minhas') return e.paidBy === user?.id
    if (filter === 'partilhadas') return e.splitType === 'partilhada'
    return true
  })

  // Balance summary: positive = I'm owed money, negative = I owe money
  let balance = 0
  for (const e of expenses) {
    if (e.splitType !== 'partilhada') continue
    if (e.status === 'confirmada' || e.status === 'disputada') continue
    const otherOwes = e.amount * e.splitRatio
    if (e.paidBy === user?.id) {
      balance += otherOwes // other parent owes me
    } else {
      balance -= otherOwes // I owe the other parent
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Despesas</h2>
        <Link to="/expenses/new"><Button size="sm">+ Nova</Button></Link>
      </div>

      {/* Balance summary */}
      {expenses.some((e) => e.splitType === 'partilhada') && (
        <div className={`p-3 rounded-xl border ${balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: balance >= 0 ? '#059669' : '#d97706' }}>
            {balance >= 0 ? 'Valor a receber' : 'Valor a pagar'}
          </p>
          <p className="text-2xl font-bold" style={{ color: balance >= 0 ? '#065f46' : '#92400e' }}>
            €{Math.abs(balance).toFixed(2)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: balance >= 0 ? '#047857' : '#b45309' }}>
            {balance >= 0 ? 'em despesas partilhadas pendentes' : 'em despesas partilhadas pendentes'}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['todas', 'pendentes', 'minhas', 'partilhadas'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-colors capitalize ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sem despesas"
          description="Nenhuma despesa registada."
          action={<Link to="/expenses/new"><Button size="sm">Registar despesa</Button></Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((exp) => {
            const child = children.find((c) => c.id === exp.childId)
            const isMyExpense = exp.paidBy === user?.id
            const otherOwes = exp.splitType === 'partilhada' ? exp.amount * exp.splitRatio : 0
            return (
              <Link key={exp.id} to={`/expenses/${exp.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">{exp.description}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {CATEGORY_LABELS[exp.category]}
                        {child && <span> · {child.fullName}</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(exp.date + 'T12:00:00'), 'dd/MM/yyyy')} · pago por {isMyExpense ? 'mim' : getParentName(exp.paidBy)}
                      </p>
                      {exp.splitType === 'partilhada' && (
                        <p className="text-xs text-blue-600 mt-0.5 font-medium">
                          Partilhada · {Math.round(exp.splitRatio * 100)}% ({isMyExpense ? 'a receber' : 'a pagar'}: €{otherOwes.toFixed(2)})
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-base font-bold text-gray-900">€{exp.amount.toFixed(2)}</span>
                      <Badge variant={STATUS_VARIANTS[exp.status] ?? 'neutral'}>
                        {STATUS_LABELS[exp.status] ?? exp.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
