import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useAppStore } from '@/store/appStore'
import { noteRepo } from '@/lib/repository'
import { Card } from '@/ui/Card'
import { Button } from '@/ui/Button'
import { EmptyState } from '@/ui/EmptyState'
import type { CalendarNote } from '@/types/domain'

const NOTE_TYPE_ICONS: Record<string, string> = {
  geral: '📝', medica: '🏥', escola: '🏫', aniversario: '🎂', extracurricular: '⚽', tribunal: '⚖️',
}

const NOTE_TYPE_LABELS: Record<string, string> = {
  geral: 'Geral', medica: 'Médica', escola: 'Escola',
  aniversario: 'Aniversário', extracurricular: 'Extracurricular', tribunal: 'Tribunal',
}

export function NotesPage() {
  const { activeFamily, children, activeFamilyMembers } = useAppStore()
  const [notes, setNotes] = useState<CalendarNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeFamily) return
    noteRepo.getNotes(activeFamily.id).then((n) => { setNotes(n); setLoading(false) })
  }, [activeFamily])

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Notas</h2>
        <Link to="/notes/new"><Button size="sm">+ Nova</Button></Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          title="Sem notas"
          description="Adicione notas sobre eventos, consultas ou recordatórios."
          action={<Link to="/notes/new"><Button size="sm">Criar nota</Button></Link>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => {
            const child = children.find((c) => c.id === note.childId)
            const author = activeFamilyMembers.find((m) => m.userId === note.authorId)
            return (
              <Link key={note.id} to={`/notes/${note.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{NOTE_TYPE_ICONS[note.noteType] ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-gray-500">
                          {NOTE_TYPE_LABELS[note.noteType]}
                        </span>
                        {note.visibility === 'privado' && (
                          <span className="text-xs text-gray-400">· Privado</span>
                        )}
                      </div>
                      {note.title && (
                        <p className="text-sm font-semibold text-gray-900 truncate">{note.title}</p>
                      )}
                      <p className="text-sm text-gray-700 truncate">{note.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {format(new Date(note.noteDate + 'T12:00:00'), 'dd/MM/yyyy')}
                        </span>
                        {child && (
                          <span
                            className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: child.color }}
                          >
                            {child.fullName}
                          </span>
                        )}
                        {author && (
                          <span className="text-xs text-gray-500">· {author.profile.displayName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
