import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { authRepo } from '@/lib/repository'
import { Card, CardHeader, CardTitle } from '@/ui/Card'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { showToast } from '@/ui/Toast'
import { Avatar } from '@/ui/Avatar'

export function SettingsPage() {
  const { user, logout } = useAuthStore()
  const { activeFamily, reset } = useAppStore()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true)
    try {
      await authRepo.updateProfile(user.id, { displayName })
      showToast('Perfil actualizado', 'success')
    } catch (e) {
      showToast((e as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    reset()
    navigate('/login', { replace: true })
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-900">Definições</h2>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>O meu perfil</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-3 mb-4">
          {user && <Avatar name={user.displayName} size="lg" />}
          <div>
            <p className="text-sm font-semibold text-gray-900">{user?.displayName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Input
            label="Nome"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Button onClick={handleSaveProfile} loading={saving} size="sm">
            Guardar
          </Button>
        </div>
      </Card>

      {/* Family info */}
      {activeFamily && (
        <Card>
          <CardHeader>
            <CardTitle>Família</CardTitle>
          </CardHeader>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nome</dt>
              <dd className="font-medium text-gray-900">{activeFamily.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">País</dt>
              <dd className="font-medium text-gray-900">{activeFamily.countryCode}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Ordem judicial</dt>
              <dd className="font-medium text-gray-900">{activeFamily.courtOrdered ? 'Sim' : 'Não'}</dd>
            </div>
          </dl>
        </Card>
      )}

      {/* App info */}
      <Card>
        <CardHeader>
          <CardTitle>Aplicação</CardTitle>
        </CardHeader>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Versão 1.0.0 — MVP</p>
          <p>Dados guardados localmente neste dispositivo.</p>
          <p className="text-xs text-gray-400 mt-2">
            Backend em nuvem disponível numa versão futura para sincronização entre dispositivos.
          </p>
        </div>
      </Card>

      {/* Logout */}
      <Button variant="danger" fullWidth onClick={handleLogout}>
        Terminar sessão
      </Button>
    </div>
  )
}
