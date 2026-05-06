import { useEffect, useRef, useState } from 'react'
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

async function resizeImage(file: File, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Erro ao carregar imagem')) }
    img.src = url
  })
}

export function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { children, activeFamilyMembers } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

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
  const receipts = expense.receipts ?? []

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

  async function handleAddReceipts(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    if (receipts.length + files.length > 5) {
      showToast('Máximo de 5 comprovativos por despesa.', 'error')
      return
    }
    setUploading(true)
    try {
      const resized = await Promise.all(files.map((f) => resizeImage(f)))
      const updated = await expenseRepo.updateExpense(expense!.id, {
        receipts: [...receipts, ...resized],
      })
      setExpense(updated)
    } catch {
      showToast('Erro ao processar imagem.', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveReceipt(index: number) {
    if (!expense) return
    const updated = await expenseRepo.updateExpense(expense.id, {
      receipts: receipts.filter((_, i) => i !== index),
    })
    setExpense(updated)
  }

  return (
    <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto">
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Comprovativo" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}

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

      {/* Receipts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">
            Comprovativos {receipts.length > 0 && <span className="text-gray-400 font-normal">({receipts.length})</span>}
          </p>
        </div>

        {receipts.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-2">
            {receipts.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={src}
                  alt={`Comprovativo ${i + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightbox(src)}
                />
                {isMyExpense && (
                  <button
                    type="button"
                    onClick={() => handleRemoveReceipt(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAddReceipts}
        />
        {receipts.length < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {uploading ? 'A processar…' : 'Adicionar comprovativo'}
          </button>
        )}
      </div>

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
