import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { useAuthStore } from '@/store/authStore'
import { registerSchema, type RegisterInput } from '@/lib/validators/family.schema'

export function RegisterPage() {
  const { register: registerUser, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const { register, handleSubmit, setError, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterInput) {
    try {
      await registerUser(data.email, data.password, data.displayName)
      navigate('/onboarding', { replace: true })
    } catch (e) {
      const msg = (e as Error).message
      if (msg === 'EMAIL_CONFIRMATION_PENDING') {
        setPendingEmail(data.email)
      } else {
        setError('email', { message: msg })
      }
    }
  }

  if (pendingEmail) {
    return (
      <AuthLayout title="Verifique o seu email" subtitle="Enviámos um link de confirmação">
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-gray-700 font-medium">{pendingEmail}</p>
            <p className="text-gray-500 text-sm mt-2">
              Abra o email e carregue no link de confirmação para activar a sua conta.
            </p>
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">
            Já confirmou?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Iniciar sessão
            </Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Comece a gerir o calendário familiar">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Nome completo"
          type="text"
          placeholder="O seu nome"
          error={errors.displayName?.message}
          required
          {...register('displayName')}
        />
        <Input
          label="Email"
          type="email"
          placeholder="o.seu@email.com"
          error={errors.email?.message}
          required
          {...register('email')}
        />
        <Input
          label="Palavra-passe"
          type="password"
          placeholder="Mínimo 6 caracteres"
          error={errors.password?.message}
          required
          {...register('password')}
        />
        <Input
          label="Confirmar Palavra-passe"
          type="password"
          placeholder="Repita a palavra-passe"
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword')}
        />
        <Button type="submit" fullWidth loading={isLoading} className="mt-2">
          Criar Conta
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        Já tem conta?{' '}
        <Link to="/login" className="text-blue-600 font-medium hover:underline">
          Inicie sessão aqui
        </Link>
      </p>
    </AuthLayout>
  )
}
