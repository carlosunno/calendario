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

  const { register, handleSubmit, setError, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterInput) {
    try {
      await registerUser(data.email, data.password, data.displayName)
      navigate('/onboarding', { replace: true })
    } catch (e) {
      setError('email', { message: (e as Error).message })
    }
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
