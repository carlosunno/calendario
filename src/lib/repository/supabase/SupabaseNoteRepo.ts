import type { CalendarNote } from '@/types/domain'
import type { INoteRepository } from '../interfaces'
import { supabase } from '@/lib/supabase/client'

function mapNote(row: Record<string, unknown>): CalendarNote {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    childId: row.child_id as string | undefined,
    authorId: row.author_id as string,
    noteDate: row.note_date as string,
    title: row.title as string | undefined,
    body: row.body as string,
    noteType: row.note_type as CalendarNote['noteType'],
    visibility: row.visibility as CalendarNote['visibility'],
    attachments: (row.attachments as CalendarNote['attachments']) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export class SupabaseNoteRepo implements INoteRepository {
  async getNotes(familyId: string): Promise<CalendarNote[]> {
    const { data, error } = await supabase
      .from('calendar_notes')
      .select('*')
      .eq('family_id', familyId)
      .order('note_date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapNote)
  }

  async getNotesByDate(familyId: string, date: string): Promise<CalendarNote[]> {
    const { data, error } = await supabase
      .from('calendar_notes')
      .select('*')
      .eq('family_id', familyId)
      .eq('note_date', date)
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapNote)
  }

  async getNote(id: string): Promise<CalendarNote | null> {
    const { data, error } = await supabase.from('calendar_notes').select('*').eq('id', id).single()
    if (error) return null
    return mapNote(data)
  }

  async createNote(data: Omit<CalendarNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarNote> {
    const { data: row, error } = await supabase
      .from('calendar_notes')
      .insert({
        family_id: data.familyId,
        child_id: data.childId ?? null,
        author_id: data.authorId,
        note_date: data.noteDate,
        title: data.title ?? null,
        body: data.body,
        note_type: data.noteType,
        visibility: data.visibility,
        attachments: data.attachments,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapNote(row)
  }

  async updateNote(id: string, data: Partial<CalendarNote>): Promise<CalendarNote> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.title !== undefined) updates.title = data.title
    if (data.body !== undefined) updates.body = data.body
    if (data.noteDate !== undefined) updates.note_date = data.noteDate
    if (data.noteType !== undefined) updates.note_type = data.noteType
    if (data.visibility !== undefined) updates.visibility = data.visibility
    if (data.attachments !== undefined) updates.attachments = data.attachments
    if (data.childId !== undefined) updates.child_id = data.childId

    const { data: row, error } = await supabase
      .from('calendar_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapNote(row)
  }

  async deleteNote(id: string): Promise<void> {
    const { error } = await supabase.from('calendar_notes').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
