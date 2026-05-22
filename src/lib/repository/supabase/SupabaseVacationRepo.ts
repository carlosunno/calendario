import type { VacationPeriod } from '@/types/domain'
import type { IVacationRepository } from '../interfaces'
import { supabase } from '@/lib/supabase/client'

function mapVacation(row: Record<string, unknown>): VacationPeriod {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    childId: row.child_id as string | undefined,
    requestedBy: row.requested_by as string,
    label: row.label as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    vacationType: row.vacation_type as VacationPeriod['vacationType'],
    affectsCustody: row.affects_custody as boolean,
    status: row.status as VacationPeriod['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export class SupabaseVacationRepo implements IVacationRepository {
  async getVacations(familyId: string): Promise<VacationPeriod[]> {
    const { data, error } = await supabase
      .from('vacation_periods')
      .select('*')
      .eq('family_id', familyId)
      .order('start_date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapVacation)
  }

  async getVacation(id: string): Promise<VacationPeriod | null> {
    const { data, error } = await supabase.from('vacation_periods').select('*').eq('id', id).single()
    if (error) return null
    return mapVacation(data)
  }

  async createVacation(data: Omit<VacationPeriod, 'id' | 'createdAt' | 'updatedAt'>): Promise<VacationPeriod> {
    const { data: row, error } = await supabase
      .from('vacation_periods')
      .insert({
        family_id: data.familyId,
        child_id: data.childId ?? null,
        requested_by: data.requestedBy,
        label: data.label,
        start_date: data.startDate,
        end_date: data.endDate,
        vacation_type: data.vacationType,
        affects_custody: data.affectsCustody,
        status: data.status,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapVacation(row)
  }

  async updateVacation(id: string, data: Partial<VacationPeriod>): Promise<VacationPeriod> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.label !== undefined) updates.label = data.label
    if (data.startDate !== undefined) updates.start_date = data.startDate
    if (data.endDate !== undefined) updates.end_date = data.endDate
    if (data.vacationType !== undefined) updates.vacation_type = data.vacationType
    if (data.affectsCustody !== undefined) updates.affects_custody = data.affectsCustody
    if (data.status !== undefined) updates.status = data.status
    if (data.childId !== undefined) updates.child_id = data.childId

    const { data: row, error } = await supabase
      .from('vacation_periods')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapVacation(row)
  }

  async deleteVacation(id: string): Promise<void> {
    const { error } = await supabase.from('vacation_periods').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
