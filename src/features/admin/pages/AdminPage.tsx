import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authRepo } from '@/lib/repository'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { Card, CardHeader, CardTitle } from '@/ui/Card'
import { Badge } from '@/ui/Badge'
import { showToast } from '@/ui/Toast'
import type { FamilyMember, Profile } from '@/types/domain'
import { lsGet, lsUpdate } from '@/lib/repository/localStorage/LocalStorage'

interface StoredUser extends Profile {
  email: string
  password: string
}

interface PendingMember extends FamilyMember {
  familyName?: string
}

export function AdminPage() {
  const { user, loginAs } = useAuthStore()
  const { reset } = useAppStore()
  const navigate = useNavigate()

  const [users, setUsers] = useState<StoredUser[]>([])
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([])
  const [linkTargets, setLinkTargets] = useState<Record<string, string>>({})

  // Create user form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)

  function reload() {
    setUsers(authRepo.getAllUsers())
  }

  useEffect(() => {
    reload()
    loadPending()
  }, [])

  async function loadPending() {
    const allMembers = lsGet<FamilyMember & { familyId: string }>('cal_members')
    const allFamilies = lsGet<{ id: string; name: string }>('cal_families')
    const pending = allMembers
      .filter((m) => m.inviteStatus === 'pendente' || m.userId.startsWith('pending-'))
      .map((m) => ({
        ...m,
        familyName: allFamilies.find((f) => f.id === m.familyId)?.name,
      }))
    setPendingMembers(pending)
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast('Preencha todos os campos.', 'error')
      return
    }
    setCreating(true)
    try {
      await authRepo.register(email.trim(), password.trim(), name.trim())
      // Register logs in the new user automatically — restore original session
      if (user) authRepo.setSession(user)
      setName('')
      setEmail('')
      setPassword('')
      reload()
      loadPending()
      showToast('Utilizador criado com sucesso.', 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleLink(member: PendingMember) {
    const targetUserId = linkTargets[member.id]
    if (!targetUserId) { showToast('Seleccione um utilizador.', 'error'); return }
    try {
      lsUpdate<FamilyMember>('cal_members', member.id, {
        userId: targetUserId,
        inviteStatus: 'aceite',
      })
      showToast('Membro vinculado com sucesso.', 'success')
      loadPending()
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  function handleLoginAs(target: StoredUser) {
    if (target.id === user?.id) return
    reset()
    loginAs(target)
    navigate('/dashboard')
    window.location.reload()
  }

  const otherUsers = users.filter((u2) => u2.id !== user?.id)

  return (
    <div className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Painel de testes</h2>
          <p className="text-xs text-gray-500">Crie utilizadores e mude de conta para testar</p>
        </div>
      </div>

      {/* Current user banner */}
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">Sessão actual</p>
        <p className="text-sm font-medium text-blue-900">{user?.displayName}</p>
        <p className="text-xs text-blue-600">{(user as StoredUser & { email?: string })?.email ?? ''}</p>
      </div>

      {/* Switch user */}
      {users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Entrar como outro utilizador</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2 mt-1">
            {users.map((u2) => (
              <div key={u2.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u2.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{u2.email} · senha: <span className="font-mono">{u2.password}</span></p>
                </div>
                {u2.id === user?.id ? (
                  <Badge variant="success">Actual</Badge>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleLoginAs(u2)}
                  >
                    Entrar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create user */}
      <Card>
        <CardHeader>
          <CardTitle>Criar utilizador de teste</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3 mt-1">
          <Input
            label="Nome"
            placeholder="ex: Ana Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="email"
            label="Email"
            placeholder="ana@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            label="Senha"
            placeholder="qualquer senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="button" loading={creating} onClick={handleCreate}>
            Criar utilizador
          </Button>
        </div>
      </Card>

      {/* Link pending members */}
      {pendingMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Convites pendentes — vincular a utilizador</CardTitle>
          </CardHeader>
          <p className="text-xs text-gray-500 mb-3">
            Crie primeiro o utilizador acima, depois vincule-o ao convite pendente da família.
          </p>
          <div className="flex flex-col gap-3">
            {pendingMembers.map((m) => (
              <div key={m.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col gap-2">
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase">
                    {m.familyName ?? 'Família'} · {m.role}
                  </p>
                  <p className="text-xs text-gray-500">ID pendente: {m.userId}</p>
                </div>
                <select
                  className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm bg-white"
                  value={linkTargets[m.id] ?? ''}
                  onChange={(e) => setLinkTargets((prev) => ({ ...prev, [m.id]: e.target.value }))}
                >
                  <option value="">— Seleccionar utilizador —</option>
                  {otherUsers.map((u2) => (
                    <option key={u2.id} value={u2.id}>{u2.displayName} ({u2.email})</option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleLink(m)}
                  disabled={!linkTargets[m.id]}
                >
                  Vincular ao convite
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {pendingMembers.length === 0 && users.length > 1 && (
        <div className="p-3 bg-green-50 rounded-xl border border-green-200">
          <p className="text-xs text-green-700 font-medium">
            Todos os membros estão vinculados. Use "Entrar" para mudar de conta e testar o calendário e aprovações do outro lado.
          </p>
        </div>
      )}
    </div>
  )
}
