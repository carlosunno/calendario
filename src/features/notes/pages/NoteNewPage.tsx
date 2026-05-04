import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { noteRepo } from '@/lib/repository'
import { noteSchema, type NoteInput } from '@/lib/validators/exception.schema'
import { Button } from '@/ui/Button'
import { Input, Select, Textarea } from '@/ui/Input'
import { showToast } from '@/ui/Toast'

export function NoteNewPage() {
  const { activeFamily, children } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      noteDate: defaultDate,
      noteType: 'geral',
      visibility: 'familia',
      childId: children[0]?.id ?? '',
    },
  })

  async function onSubmit(data: NoteInput) {
    if (!activeFamily || !user) return
    try {
      await noteRepo.createNote({
        familyId: activeFamily.id,
        childId: data.childId || undefined,
        authorId: user.id,
        noteDate: data.noteDate,
        title: data.title,
        body: data.body,
        noteType: data.noteType,
        visibility: data.visibility,
        attachments: [],
      })
      showToast('Nota guardada', 'success')
      navigate('/notes')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900">Nova Nota</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input label="Data" type="date" required error={errors.noteDate?.message} {...register('noteDate')} />

        {children.length > 0 && (
          <Select label="Filho/a (opcional)" {...register('childId')}>
            <option value="">Família (todos)</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName}</option>
            ))}
          </Select>
        )}

        <Select label="Tipo" required error={errors.noteType?.message} {...register('noteType')}>
          <option value="geral">📝 Geral</option>
          <option value="medica">🏥 Médica</option>
          <option value="escola">🏫 Escola</option>
          <option value="aniversario">🎂 Aniversário</option>
          <option value="extracurricular">⚽ Extracurricular</option>
          <option value="tribunal">⚖️ Tribunal</option>
        </Select>

        <Input label="Título (opcional)" placeholder="Resumo breve..." error={errors.title?.message} {...register('title')} />

        <Textarea label="Conteúdo" required placeholder="Escreva a sua nota..." error={errors.body?.message} {...register('body')} />

        <Select label="Visibilidade" required {...register('visibility')}>
          <option value="familia">Família (ambos os pais)</option>
          <option value="privado">Privado (só eu)</option>
        </Select>

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-2">
          Guardar nota
        </Button>
      </form>
    </div>
  )
}
