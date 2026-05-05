import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { expenseRepo } from '@/lib/repository'
import { Button } from '@/ui/Button'
import { Input, Select, Textarea } from '@/ui/Input'
import { showToast } from '@/ui/Toast'

const CATEGORIES = [
  { value: 'saude', label: '🏥 Saúde' },
  { value: 'escola', label: '🏫 Escola' },
  { value: 'desporto', label: '⚽ Desporto' },
  { value: 'alimentacao', label: '🍽 Alimentação' },
  { value: 'vestuario', label: '👕 Vestuário' },
  { value: 'lazer', label: '🎡 Lazer' },
  { value: 'outro', label: '📦 Outro' },
]

export function ExpenseNewPage() {
  const { activeFamily, children, activeFamilyMembers } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [category, setCategory] = useState('outro')
  const [childId, setChildId] = useState('')
  const [isShared, setIsShared] = useState(false)
  const [splitPercent, setSplitPercent] = useState(50)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const otherParents = activeFamilyMembers.filter((m) => m.userId !== user?.id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeFamily || !user) return

    const parsedAmount = parseFloat(amount)
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Preenche todos os campos obrigatórios.', 'error')
      return
    }

    setSubmitting(true)
    try {
      await expenseRepo.createExpense({
        familyId: activeFamily.id,
        childId: childId || undefined,
        description: description.trim(),
        amount: parsedAmount,
        date,
        category: category as any,
        paidBy: user.id,
        splitType: isShared ? 'partilhada' : 'total',
        splitRatio: isShared ? splitPercent / 100 : 0,
        status: isShared ? 'pendente' : 'paga',
        notes: notes.trim() || undefined,
      })
      showToast('Despesa registada.', 'success')
      navigate('/expenses')
    } catch {
      showToast('Erro ao guardar despesa.', 'error')
    } finally {
      setSubmitting(false)
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
        <h2 className="text-lg font-bold text-gray-900">Nova Despesa</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Consulta pediatra"
            required
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (€) *</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>

        {children.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filho (opcional)</label>
            <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
              <option value="">— Nenhum —</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.fullName}</option>
              ))}
            </Select>
          </div>
        )}

        {/* Shared toggle */}
        <div className="rounded-xl border border-gray-200 p-3 flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded text-blue-600"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700">Despesa partilhada</span>
          </label>

          {isShared && (
            <div className="flex flex-col gap-3 pt-1 border-t border-gray-100">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    {otherParents[0]?.profile.displayName ?? 'Outro responsável'} paga
                  </label>
                  <span className="text-sm font-bold text-blue-600">{splitPercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={splitPercent}
                  onChange={(e) => setSplitPercent(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
              {amount && !isNaN(parseFloat(amount)) && (
                <p className="text-xs text-blue-600">
                  {otherParents[0]?.profile.displayName ?? 'Outro responsável'} ficará a dever{' '}
                  <strong>€{(parseFloat(amount) * splitPercent / 100).toFixed(2)}</strong>
                  {' '}({splitPercent}% de €{parseFloat(amount).toFixed(2)})
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Informação adicional..."
            rows={2}
          />
        </div>

        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? 'A guardar…' : 'Registar despesa'}
        </Button>
      </form>
    </div>
  )
}
