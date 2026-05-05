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
import type { CustodyRegime, FamilyMember, Profile } from '@/types/domain'
import { lsGet, lsSave, lsUpdate, genId, now } from '@/lib/repository/localStorage/LocalStorage'

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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Create user form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createWithFamily, setCreateWithFamily] = useState(false)
  const [createFamilyId, setCreateFamilyId] = useState('')
  const [createRole, setCreateRole] = useState<'pai' | 'mae' | 'avo' | 'cuidador'>('mae')
  const [allFamilies, setAllFamilies] = useState<{ id: string; name: string }[]>([])

  // Join family with code
  const [familyCode, setFamilyCode] = useState('')
  const [joinRole, setJoinRole] = useState<'pai' | 'mae' | 'avo' | 'cuidador'>('mae')
  const [joining, setJoining] = useState(false)

  function reload() {
    setUsers(authRepo.getAllUsers())
    loadPending()
    setAllFamilies(lsGet<{ id: string; name: string }>('cal_families'))
  }

  useEffect(() => { reload() }, [])

  function loadPending() {
    const allMembers = lsGet<FamilyMember & { familyId: string }>('cal_members')
    const allFamilies = lsGet<{ id: string; name: string }>('cal_families')
    const pending = allMembers
      .filter((m) => m.inviteStatus === 'pendente' || m.userId.startsWith('pending-'))
      .map((m) => ({
        ...m,
        profile: m.profile ?? { id: m.userId, displayName: 'Pendente', email: '', locale: 'pt-PT', timezone: 'Europe/Lisbon', createdAt: now() },
        familyName: allFamilies.find((f) => f.id === m.familyId)?.name,
      }))
    setPendingMembers(pending)
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast('Preencha todos os campos.', 'error'); return
    }
    setCreating(true)
    try {
      const newUser = await authRepo.register(email.trim(), password.trim(), name.trim())
      if (user) authRepo.setSession(user)

      // Optionally associate to a family immediately
      if (createWithFamily && createFamilyId) {
        const members = lsGet<FamilyMember>('cal_members')
        const colorPalette = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']
        const colorIdx = members.filter((m) => m.familyId === createFamilyId).length
        const newMember: FamilyMember = {
          id: genId(),
          familyId: createFamilyId,
          userId: newUser.id,
          profile: { id: newUser.id, displayName: newUser.displayName, email: email.trim(), locale: 'pt-PT', timezone: 'Europe/Lisbon', createdAt: now() },
          role: createRole,
          inviteStatus: 'aceite',
          color: colorPalette[colorIdx % colorPalette.length],
          canApprove: true, canRequest: true, isViewOnly: false,
        }
        members.push(newMember)
        lsSave('cal_members', members)
        // Fix regimes where weekBParentId is unset
        const regimes = lsGet<CustodyRegime>('cal_regimes')
        lsSave('cal_regimes', regimes.map((r) => {
          if (r.familyId !== createFamilyId) return r
          return { ...r, rules: r.rules.map((rule) =>
            rule.ruleType === 'semanas_alternadas' && rule.weekBParentId === rule.weekAParentId
              ? { ...rule, weekBParentId: newUser.id } : rule
          )}
        }))
      }

      setName(''); setEmail(''); setPassword(''); setCreateWithFamily(false); setCreateFamilyId('')
      reload()
      showToast('Utilizador criado' + (createWithFamily && createFamilyId ? ' e associado à família.' : '.'), 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(targetId: string) {
    if (targetId === user?.id) { showToast('Não pode eliminar a sua própria conta.', 'error'); return }
    try {
      await authRepo.deleteUser(targetId)
      // Remove associated family members
      const members = lsGet<FamilyMember>('cal_members')
      lsSave('cal_members', members.filter((m) => m.userId !== targetId))
      setConfirmDelete(null)
      reload()
      showToast('Utilizador eliminado.', 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function handleLink(member: PendingMember) {
    const targetUserId = linkTargets[member.id]
    if (!targetUserId) { showToast('Seleccione um utilizador.', 'error'); return }
    const oldUserId = member.userId
    try {
      lsUpdate<FamilyMember>('cal_members', member.id, { userId: targetUserId, inviteStatus: 'aceite' })

      // Fix any regimes where weekBParentId was the pending userId or same as weekAParentId
      const regimes = lsGet<CustodyRegime>('cal_regimes')
      const updated = regimes.map((r) => {
        if (r.familyId !== member.familyId) return r
        const newRules = r.rules.map((rule) => {
          if (rule.ruleType !== 'semanas_alternadas') return rule
          const needsFix =
            rule.weekBParentId === oldUserId ||
            rule.weekBParentId === rule.weekAParentId
          return needsFix ? { ...rule, weekBParentId: targetUserId } : rule
        })
        return { ...r, rules: newRules }
      })
      lsSave('cal_regimes', updated)

      showToast('Membro vinculado e regimes actualizados.', 'success')
      reload()
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  async function handleJoinFamily() {
    const code = familyCode.trim()
    if (!code || !user) { showToast('Insira o código da família.', 'error'); return }
    setJoining(true)
    try {
      const families = lsGet<{ id: string; name: string }>('cal_families')
      const family = families.find((f) => f.id === code)
      if (!family) { showToast('Família não encontrada. Verifique o código.', 'error'); setJoining(false); return }

      const members = lsGet<FamilyMember>('cal_members')
      const alreadyMember = members.some((m) => m.familyId === family.id && m.userId === user.id)
      if (alreadyMember) { showToast('Já é membro desta família.', 'error'); setJoining(false); return }

      const colorPalette = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']
      const colorIdx = members.filter((m) => m.familyId === family.id).length
      const newMember: FamilyMember = {
        id: genId(),
        familyId: family.id,
        userId: user.id,
        profile: { id: user.id, displayName: user.displayName, email: (user as StoredUser).email ?? '', locale: 'pt-PT', timezone: 'Europe/Lisbon', createdAt: now() },
        role: joinRole,
        inviteStatus: 'aceite',
        color: colorPalette[colorIdx % colorPalette.length],
        canApprove: true,
        canRequest: true,
        isViewOnly: false,
      }
      lsGet<FamilyMember>('cal_members')
      const allMembers = lsGet<FamilyMember>('cal_members')
      allMembers.push(newMember)
      lsSave('cal_members', allMembers)

      setFamilyCode('')

      // Fix regimes: assign this user as weekBParentId where still unset
      const regimes = lsGet<CustodyRegime>('cal_regimes')
      const updatedRegimes = regimes.map((r) => {
        if (r.familyId !== family.id) return r
        const newRules = r.rules.map((rule) => {
          if (rule.ruleType !== 'semanas_alternadas') return rule
          const needsFix = rule.weekBParentId === rule.weekAParentId
          return needsFix ? { ...rule, weekBParentId: user.id } : rule
        })
        return { ...r, rules: newRules }
      })
      lsSave('cal_regimes', updatedRegimes)

      showToast(`Adicionado à família "${family.name}".`, 'success')
      reload()
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setJoining(false)
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
          <p className="text-xs text-gray-500">Crie utilizadores, mude de conta e associe famílias</p>
        </div>
      </div>

      {/* Current user */}
      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-0.5">Sessão actual</p>
        <p className="text-sm font-medium text-blue-900">{user?.displayName}</p>
      </div>

      {/* Switch / delete users */}
      {users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Utilizadores</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-2 mt-1">
            {users.map((u2) => (
              <div key={u2.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{u2.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {u2.email} · <span className="font-mono">{u2.password}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {u2.id === user?.id ? (
                    <Badge variant="success">Actual</Badge>
                  ) : (
                    <>
                      <Button type="button" variant="outline" onClick={() => handleLoginAs(u2)}>
                        Entrar
                      </Button>
                      {confirmDelete === u2.id ? (
                        <div className="flex gap-1">
                          <Button type="button" variant="danger" onClick={() => handleDelete(u2.id)}>
                            Confirmar
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(null)}>
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(u2.id)}
                          className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Join family with code */}
      <Card>
        <CardHeader>
          <CardTitle>Aderir a uma família com código</CardTitle>
        </CardHeader>
        <p className="text-xs text-gray-500 mb-3">
          Coloque o código da família (visível em Família → código) para o utilizador actual aderir.
        </p>
        <div className="flex flex-col gap-3">
          <Input
            label="Código da família"
            placeholder="Cole aqui o código"
            value={familyCode}
            onChange={(e) => setFamilyCode(e.target.value)}
          />
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Papel</p>
            <select
              className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={joinRole}
              onChange={(e) => setJoinRole(e.target.value as typeof joinRole)}
            >
              <option value="mae">Mãe</option>
              <option value="pai">Pai</option>
              <option value="avo">Avó/Avô</option>
              <option value="cuidador">Cuidador</option>
            </select>
          </div>
          <Button type="button" loading={joining} onClick={handleJoinFamily} disabled={!familyCode.trim()}>
            Aderir à família
          </Button>
        </div>
      </Card>

      {/* Create user */}
      <Card>
        <CardHeader>
          <CardTitle>Criar utilizador de teste</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-3 mt-1">
          <Input label="Nome" placeholder="ex: Ana Silva" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="email" label="Email" placeholder="ana@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" label="Senha" placeholder="qualquer senha" value={password} onChange={(e) => setPassword(e.target.value)} />

          {/* Inline family association */}
          <button
            type="button"
            onClick={() => setCreateWithFamily((v) => !v)}
            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors text-left ${
              createWithFamily ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className={`text-sm font-medium ${createWithFamily ? 'text-blue-700' : 'text-gray-700'}`}>
              Associar a uma família
            </span>
            <div className={`h-5 w-9 rounded-full transition-colors flex-shrink-0 ${createWithFamily ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <div className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${createWithFamily ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          {createWithFamily && (
            <div className="flex flex-col gap-2 pl-1">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Família</p>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm bg-white"
                  value={createFamilyId}
                  onChange={(e) => setCreateFamilyId(e.target.value)}
                >
                  <option value="">— Seleccionar família —</option>
                  {allFamilies.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Papel</p>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-gray-300 text-sm bg-white"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as typeof createRole)}
                >
                  <option value="mae">Mãe</option>
                  <option value="pai">Pai</option>
                  <option value="avo">Avó/Avô</option>
                  <option value="cuidador">Cuidador</option>
                </select>
              </div>
            </div>
          )}

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
            Crie o utilizador acima e depois vincule-o ao convite pendente. Os regimes são actualizados automaticamente.
          </p>
          <div className="flex flex-col gap-3">
            {pendingMembers.map((m) => (
              <div key={m.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex flex-col gap-2">
                <div>
                  <p className="text-xs font-semibold text-amber-700 uppercase">{m.familyName ?? 'Família'} · {m.role}</p>
                  <p className="text-xs text-gray-400 font-mono">{m.userId}</p>
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
                <Button type="button" variant="outline" onClick={() => handleLink(m)} disabled={!linkTargets[m.id]}>
                  Vincular ao convite
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
