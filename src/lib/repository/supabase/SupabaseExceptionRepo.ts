import type { AuditLogEntry, ExceptionRequest } from '@/types/domain'
import type { IExceptionRepository } from '../interfaces'
import { supabase } from '@/lib/supabase/client'

function mapException(row: Record<string, unknown>): ExceptionRequest {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    childId: row.child_id as string,
    requestedBy: row.requested_by as string,
    exceptionType: row.exception_type as ExceptionRequest['exceptionType'],
    status: row.status as ExceptionRequest['status'],
    originalDate: row.original_date as string,
    originalEndDate: row.original_end_date as string | undefined,
    originalParentId: row.original_parent_id as string,
    proposedDate: row.proposed_date as string | undefined,
    proposedEndDate: row.proposed_end_date as string | undefined,
    proposedParentId: row.proposed_parent_id as string | undefined,
    reason: row.reason as string | undefined,
    isUrgent: row.is_urgent as boolean,
    respondedBy: row.responded_by as string | undefined,
    respondedAt: row.responded_at as string | undefined,
    rejectionReason: row.rejection_reason as string | undefined,
    expiresAt: row.expires_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function mapAuditEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    exceptionId: row.exception_id as string,
    actorId: row.actor_id as string,
    action: row.action as AuditLogEntry['action'],
    previousState: row.previous_state as Partial<ExceptionRequest> | undefined,
    newState: row.new_state as Partial<ExceptionRequest> | undefined,
    createdAt: row.created_at as string,
  }
}

export class SupabaseExceptionRepo implements IExceptionRepository {
  async getExceptions(familyId: string): Promise<ExceptionRequest[]> {
    const { data, error } = await supabase
      .from('exception_requests')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapException)
  }

  async getException(id: string): Promise<ExceptionRequest | null> {
    const { data, error } = await supabase.from('exception_requests').select('*').eq('id', id).single()
    if (error) return null
    return mapException(data)
  }

  async createException(data: Omit<ExceptionRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExceptionRequest> {
    const { data: row, error } = await supabase
      .from('exception_requests')
      .insert({
        family_id: data.familyId,
        child_id: data.childId,
        requested_by: data.requestedBy,
        exception_type: data.exceptionType,
        status: data.status,
        original_date: data.originalDate,
        original_end_date: data.originalEndDate ?? null,
        original_parent_id: data.originalParentId,
        proposed_date: data.proposedDate ?? null,
        proposed_end_date: data.proposedEndDate ?? null,
        proposed_parent_id: data.proposedParentId ?? null,
        reason: data.reason ?? null,
        is_urgent: data.isUrgent,
        responded_by: data.respondedBy ?? null,
        responded_at: data.respondedAt ?? null,
        rejection_reason: data.rejectionReason ?? null,
        expires_at: data.expiresAt ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)

    const exc = mapException(row)
    await this.addAuditEntry({
      exceptionId: exc.id,
      actorId: data.requestedBy,
      action: 'criado',
      newState: exc,
      createdAt: new Date().toISOString(),
    })
    return exc
  }

  async updateException(id: string, data: Partial<ExceptionRequest>): Promise<ExceptionRequest> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.status !== undefined) updates.status = data.status
    if (data.proposedDate !== undefined) updates.proposed_date = data.proposedDate
    if (data.proposedEndDate !== undefined) updates.proposed_end_date = data.proposedEndDate
    if (data.proposedParentId !== undefined) updates.proposed_parent_id = data.proposedParentId
    if (data.reason !== undefined) updates.reason = data.reason
    if (data.isUrgent !== undefined) updates.is_urgent = data.isUrgent
    if (data.respondedBy !== undefined) updates.responded_by = data.respondedBy
    if (data.respondedAt !== undefined) updates.responded_at = data.respondedAt
    if (data.rejectionReason !== undefined) updates.rejection_reason = data.rejectionReason
    if (data.expiresAt !== undefined) updates.expires_at = data.expiresAt

    const { data: row, error } = await supabase
      .from('exception_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapException(row)
  }

  async getAuditLog(exceptionId: string): Promise<AuditLogEntry[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('exception_id', exceptionId)
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapAuditEntry)
  }

  async addAuditEntry(entry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> {
    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        exception_id: entry.exceptionId,
        actor_id: entry.actorId,
        action: entry.action,
        previous_state: entry.previousState ?? null,
        new_state: entry.newState ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapAuditEntry(data)
  }
}
