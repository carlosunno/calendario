import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'
import { noteRepo } from '@/lib/repository'
import { Card } from '@/ui/Card'
import { Button } from '@/ui/Button'
import { showToast } from '@/ui/Toast'
import type { CalendarNote } from '@/types/domain'

const NOTE_TYPE_ICONS: Record<string, string> = {
  geral: '📝', medica: '🏥', escola: '🏫', aniversario: '🎂', extracurricular: '⚽', tribunal: '⚖️',
}

export function NoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { children, activeFamilyMembers } = useAppStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [note, setNote] = useState<CalendarNote | null>(null)

  useEffect(() => {
    if (!id) return
    noteRepo.getNote(id).then(setNote)
  }, [id])

  if (!note) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const child = children.find((c) => c.id === note.childId)
  const author = activeFamilyMembers.find((m) => m.userId === note.authorId)
  const isOwner = note.authorId === user?.id

  async function handleDelete() {
    if (!confirm('Eliminar esta nota?')) return
    try {
      await noteRepo.deleteNote(note!.id)
      showToast('Nota eliminada', 'info')
      navigate('/notes')
    } catch (e) {
      showToast((e as Error).message, 'error')
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{NOTE_TYPE_ICONS[note.noteType] ?? '📝'}</span>
            <h2 className="text-lg font-bold text-gray-900">{note.title ?? 'Nota'}</h2>
          </div>
          <p className="text-xs text-gray-500">
            {format(new Date(note.noteDate + 'T12:00:00'), 'dd/MM/yyyy')}
            {author && ` · ${author.profile.displayName}`}
          </p>
        </div>
      </div>

      <Card>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.body}</p>
      </Card>

      <div className="flex gap-3 text-sm text-gray-500">
        {child && (
          <span
            className="px-2 py-0.5 rounded-full text-white text-xs font-medium"
            style={{ backgroundColor: child.color }}
          >
            {child.fullName}
          </span>
        )}
        <span>{note.visibility === 'privado' ? '🔒 Privado' : '👨‍👩‍👧 Família'}</span>
      </div>

      {isOwner && (
        <Button variant="danger" onClick={handleDelete}>
          Eliminar nota
        </Button>
      )}
    </div>
  )
}
