import { useState } from 'react'
import { familyRepo } from '@/lib/repository'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { showToast } from '@/ui/Toast'

interface InviteStepProps {
  familyId: string
  onFinish: () => void
  onBack: () => void
  loading: boolean
}

export function InviteStep({ familyId, onFinish, onBack, loading }: InviteStepProps) {
  const [email, setEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [invited, setInvited] = useState(false)

  async function handleInvite() {
    if (!email.trim()) return
    setInviteLoading(true)
    try {
      // In a real app this would send an email — for now we add as pending member
      await familyRepo.addMember({
        familyId,
        userId: 'pending-' + Date.now(),
        role: 'mae',
        inviteStatus: 'pendente',
        color: '#f59e0b',
        canApprove: true,
        canRequest: true,
        isViewOnly: false,
      })
      setInvited(true)
      showToast('Convite enviado para ' + email, 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
        <p className="text-sm text-amber-800">
          Convide o outro responsável para que ambos possam gerir o calendário em conjunto.
        </p>
      </div>

      {invited ? (
        <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-center gap-3">
          <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-800">Convite enviado para <strong>{email}</strong></p>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              label="Email do co-pai/mãe"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleInvite}
              loading={inviteLoading}
              disabled={!email.trim()}
            >
              Convidar
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Pode convidar mais tarde nas definições da família.
      </p>

      <div className="flex gap-2 mt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Anterior
        </Button>
        <Button type="button" fullWidth onClick={onFinish} loading={loading}>
          Concluir configuração
        </Button>
      </div>
    </div>
  )
}
