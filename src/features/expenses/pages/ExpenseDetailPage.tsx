import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { expenseRepo } from '@/lib/repository'
import { Card } from '@/ui/Card'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { showToast } from '@/ui/Toast'
import type { Expense } from '@/types/domain'

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

export function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { children, activeFamilyMembers } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!id) return
    expenseRepo.getExpense(id).then(setExpense)
  }, [id])

  if (!expense) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const child = children.find((c) => c.id === expense.childId)
  const payer = activeFamilyMembers.find((m) => m.userId === expense.paidBy)
  const isMyExpense = expense.paidBy === user?.id
  const otherOwes = expense.splitType === 'partilhada' ? expense.amount * expense.splitRatio : 0
  const canConfirm = expense.splitType === 'partilhada' && expense.status === 'pendente' && !isMyExpense
  const canMarkReceived = expense.splitType === 'partilhada' && expense.status === 'aguarda_confirmacao' && isMyExpense
  const canDelete = isMyExpense

  async function handleConfirmPayment() {
    if (!expense || !user) return
    setLoading(true)
    try {
      const updated = await expenseRepo.updateExpense(expense.id, {
        status: 'aguarda_confirmacao',
        confirmedBy: user.id,
        confirmedAt: new Date().toISOString(),
      })
      setExpense(updated)
      showToast('Pagamento confirmado — a aguardar validação.', 'success')
    } catch {
      showToast('Erro ao confirmar pagamento.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkReceived() {
    if (!expense) return
    setLoading(true)
    try {
      const updated = await expenseRepo.updateExpense(expense.id, { status: 'confirmada' })
      setExpense(updated)
      showToast('Despesa confirmada como paga.', 'success')
    } catch {
      showToast('Erro ao actualizar despesa.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!expense) return
    setLoading(true)
    try {
      await expenseRepo.deleteExpense(expense.id)
      showToast('Despesa eliminada.', 'success')
      navigate('/expenses')
    } catch {
      showToast('Erro ao eliminar despesa.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900 flex-1 truncate">{expense.description}</h2>
        <Badge variant={STATUS_VARIANTS[expense.status] ?? 'neutral'}>
          {STATUS_LABELS[expense.status] ?? expense.status}
        </Badge>
      </div>

      <Card>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-gray-900">€{expense.amount.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{CATEGORY_LABELS[expense.category]}</p>
          </div>
          <p className="text-sm text-gray-500">
            {format(new Date(expense.date + 'T12:00:00'), 'dd/MM/yyyy')}
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Pago por</span>
            <span className="font-medium text-gray-900">
              {isMyExpense ? 'Mim' : (payer?.profile.displayName ?? 'Desconhecido')}
            </span>
          </div>
          {child && (
            <div className="flex justify-between">
              <span className="text-gray-500">Filho</span>
              <span className="font-medium text-gray-900">{child.fullName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Tipo</span>
            <span className="font-medium text-gray-900">
              {expense.splitType === 'partilhada' ? 'Partilhada' : 'Individual'}
            </span>
          </div>
          {expense.splitType === 'partilhada' && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-500">Percentagem</span>
                <span className="font-medium text-blue-600">{Math.round(expense.splitRatio * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{isMyExpense ? 'A receber' : 'A pagar'}</span>
                <span className={`font-bold ${isMyExpense ? 'text-emerald-600' : 'text-amber-600'}`}>
                  €{otherOwes.toFixed(2)}
                </span>
              </div>
            </>
          )}
          {expense.notes && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-gray-500 text-xs mb-1">Notas</p>
              <p className="text-gray-700">{expense.notes}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {canConfirm && (
          <Button onClick={handleConfirmPayment} disabled={loading}>
            Confirmar que paguei
          </Button>
        )}
        {canMarkReceived && (
          <Button onClick={handleMarkReceived} disabled={loading}>
            Marcar como recebido
          </Button>
        )}
        {canDelete && (
          <>
            {!confirmDelete ? (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-red-500 border-red-200 hover:bg-red-50">
                Eliminar despesa
              </Button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex flex-col gap-2">
                <p className="text-sm text-red-700 font-medium">Confirmas a eliminação desta despesa?</p>
                <div className="flex gap-2">
                  <Button onClick={handleDelete} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0">
                    Eliminar
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
