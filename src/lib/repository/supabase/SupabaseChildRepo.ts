import type { Child, CustodyRegime, RegimeRule } from '@/types/domain'
import type { IChildRepository, IRegimeRepository } from '../interfaces'
import { supabase } from '@/lib/supabase/client'

function mapChild(row: Record<string, unknown>): Child {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    fullName: row.full_name as string,
    dateOfBirth: row.date_of_birth as string | undefined,
    schoolName: row.school_name as string | undefined,
    schoolRegion: row.school_region as string | undefined,
    color: row.color as string,
    avatarUrl: row.avatar_url as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  }
}

function mapRegime(row: Record<string, unknown>): CustodyRegime {
  return {
    id: row.id as string,
    childId: row.child_id as string,
    familyId: row.family_id as string,
    regimeType: row.regime_type as CustodyRegime['regimeType'],
    label: row.label as string,
    effectiveFrom: row.effective_from as string,
    effectiveUntil: row.effective_until as string | undefined,
    primaryParentId: row.primary_parent_id as string,
    courtOrdered: row.court_ordered as boolean,
    priority: row.priority as number,
    isActive: row.is_active as boolean,
    rules: (row.rules as RegimeRule[]) ?? [],
    createdAt: row.created_at as string,
  }
}

export class SupabaseChildRepo implements IChildRepository {
  async getChildren(familyId: string): Promise<Child[]> {
    const { data, error } = await supabase.from('children').select('*').eq('family_id', familyId)
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapChild)
  }

  async getChild(id: string): Promise<Child | null> {
    const { data, error } = await supabase.from('children').select('*').eq('id', id).single()
    if (error) return null
    return mapChild(data)
  }

  async createChild(data: Omit<Child, 'id' | 'createdAt'>): Promise<Child> {
    const { data: row, error } = await supabase
      .from('children')
      .insert({
        family_id: data.familyId,
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth ?? null,
        school_name: data.schoolName ?? null,
        school_region: data.schoolRegion ?? null,
        color: data.color,
        avatar_url: data.avatarUrl ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapChild(row)
  }

  async updateChild(id: string, data: Partial<Child>): Promise<Child> {
    const updates: Record<string, unknown> = {}
    if (data.fullName !== undefined) updates.full_name = data.fullName
    if (data.dateOfBirth !== undefined) updates.date_of_birth = data.dateOfBirth
    if (data.schoolName !== undefined) updates.school_name = data.schoolName
    if (data.schoolRegion !== undefined) updates.school_region = data.schoolRegion
    if (data.color !== undefined) updates.color = data.color
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl
    if (data.notes !== undefined) updates.notes = data.notes

    const { data: row, error } = await supabase.from('children').update(updates).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return mapChild(row)
  }

  async deleteChild(id: string): Promise<void> {
    const { error } = await supabase.from('children').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}

export class SupabaseRegimeRepo implements IRegimeRepository {
  async getRegimes(familyId: string): Promise<CustodyRegime[]> {
    const { data, error } = await supabase.from('custody_regimes').select('*').eq('family_id', familyId)
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapRegime)
  }

  async getRegime(id: string): Promise<CustodyRegime | null> {
    const { data, error } = await supabase.from('custody_regimes').select('*').eq('id', id).single()
    if (error) return null
    return mapRegime(data)
  }

  async createRegime(data: Omit<CustodyRegime, 'id' | 'createdAt'>): Promise<CustodyRegime> {
    const { data: row, error } = await supabase
      .from('custody_regimes')
      .insert({
        child_id: data.childId,
        family_id: data.familyId,
        regime_type: data.regimeType,
        label: data.label,
        effective_from: data.effectiveFrom,
        effective_until: data.effectiveUntil ?? null,
        primary_parent_id: data.primaryParentId,
        court_ordered: data.courtOrdered,
        priority: data.priority,
        is_active: data.isActive,
        rules: data.rules,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapRegime(row)
  }

  async updateRegime(id: string, data: Partial<CustodyRegime>): Promise<CustodyRegime> {
    const updates: Record<string, unknown> = {}
    if (data.regimeType !== undefined) updates.regime_type = data.regimeType
    if (data.label !== undefined) updates.label = data.label
    if (data.effectiveFrom !== undefined) updates.effective_from = data.effectiveFrom
    if (data.effectiveUntil !== undefined) updates.effective_until = data.effectiveUntil
    if (data.primaryParentId !== undefined) updates.primary_parent_id = data.primaryParentId
    if (data.courtOrdered !== undefined) updates.court_ordered = data.courtOrdered
    if (data.priority !== undefined) updates.priority = data.priority
    if (data.isActive !== undefined) updates.is_active = data.isActive
    if (data.rules !== undefined) updates.rules = data.rules

    const { data: row, error } = await supabase.from('custody_regimes').update(updates).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return mapRegime(row)
  }

  async deleteRegime(id: string): Promise<void> {
    const { error } = await supabase.from('custody_regimes').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
