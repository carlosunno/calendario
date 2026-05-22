import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { hydrate } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Garantir que o profile existe com o nome correcto
        const meta = session.user.user_metadata
        if (meta?.displayName) {
          await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              display_name: meta.displayName,
              email: session.user.email ?? '',
            })
            .select()
            .single()
        }
        hydrate()
        navigate('/onboarding', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true })
      }
    })

    // Verificar se já há sessão activa (ex: refresh de página)
    supabase.auth.getSession().then(({ data, error: err }) => {
      if (err) { setError('Erro ao confirmar email. Tenta novamente.'); return }
      if (data.session) {
        hydrate()
        navigate('/onboarding', { replace: true })
      }
    })
  }, [navigate, hydrate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <a href="/register" className="mt-4 inline-block text-blue-600 underline">
            Voltar ao registo
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">A confirmar a sua conta...</p>
      </div>
    </div>
  )
}
