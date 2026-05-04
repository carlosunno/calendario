import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/ui/Button'
import { Input } from '@/ui/Input'
import { useAuthStore } from '@/store/authStore'
import { loginSchema, type LoginInput } from '@/lib/validators/family.schema'

export function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, setError, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    try {
      await login(data.email, data.password)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError('email', { message: (e as Error).message })
    }
  }

  return (
    <AuthLayout title="Calendário Familiar" subtitle="Gestão partilhada para famílias separadas">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
          placeholder="••••••••"
          error={errors.password?.message}
          required
          {...register('password')}
        />
        <Button type="submit" fullWidth loading={isLoading} className="mt-2">
          Iniciar Sessão
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-4">
        Não tem conta?{' '}
        <Link to="/register" className="text-blue-600 font-medium hover:underline">
          Registe-se aqui
        </Link>
      </p>
    </AuthLayout>
  )
}
