import type { Family, FamilyMember, Profile } from '@/types/domain'
import type { IFamilyRepository } from '../interfaces'
import { supabase } from '@/lib/supabase/client'

function mapFamily(row: Record<string, unknown>): Family {
  return {
    id: row.id as string,
    name: row.name as string,
    countryCode: row.country_code as string,
    regionCode: row.region_code as string | undefined,
    custodyType: row.custody_type as Family['custodyType'],
    courtOrdered: row.court_ordered as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    email: row.email as string,
    avatarUrl: row.avatar_url as string | undefined,
    phone: row.phone as string | undefined,
    locale: (row.locale as string) ?? 'pt-PT',
    timezone: (row.timezone as string) ?? 'Europe/Lisbon',
    createdAt: row.created_at as string,
  }
}

function mapMember(row: Record<string, unknown>, profile: Profile): FamilyMember {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    userId: row.user_id as string,
    profile,
    role: row.role as FamilyMember['role'],
    inviteStatus: row.invite_status as FamilyMember['inviteStatus'],
    color: row.color as string,
    canApprove: row.can_approve as boolean,
    canRequest: row.can_request as boolean,
    isViewOnly: row.is_view_only as boolean,
  }
}

export class SupabaseFamilyRepo implements IFamilyRepository {
  async getFamilies(userId: string): Promise<Family[]> {
    const { data, error } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .eq('invite_status', 'aceite')
    if (error) throw new Error(error.message)

    if (!data?.length) return []
    const ids = data.map((m) => m.family_id)

    const { data: families, error: famErr } = await supabase.from('families').select('*').in('id', ids)
    if (famErr) throw new Error(famErr.message)
    return (families ?? []).map(mapFamily)
  }

  async getFamily(id: string): Promise<Family | null> {
    const { data, error } = await supabase.from('families').select('*').eq('id', id).single()
    if (error) return null
    return mapFamily(data)
  }

  async createFamily(data: Omit<Family, 'id' | 'createdAt' | 'updatedAt'>): Promise<Family> {
    const { data: row, error } = await supabase
      .from('families')
      .insert({
        name: data.name,
        country_code: data.countryCode,
        region_code: data.regionCode,
        custody_type: data.custodyType,
        court_ordered: data.courtOrdered,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapFamily(row)
  }

  async updateFamily(id: string, data: Partial<Family>): Promise<Family> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) updates.name = data.name
    if (data.countryCode !== undefined) updates.country_code = data.countryCode
    if (data.regionCode !== undefined) updates.region_code = data.regionCode
    if (data.custodyType !== undefined) updates.custody_type = data.custodyType
    if (data.courtOrdered !== undefined) updates.court_ordered = data.courtOrdered

    const { data: row, error } = await supabase.from('families').update(updates).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return mapFamily(row)
  }

  async getMembers(familyId: string): Promise<FamilyMember[]> {
    const { data: members, error } = await supabase
      .from('family_members')
      .select('*, profiles(*)')
      .eq('family_id', familyId)
    if (error) throw new Error(error.message)

    return (members ?? []).map((m) => {
      const profileRow = m.profiles as Record<string, unknown>
      const profile = profileRow ? mapProfile(profileRow) : {
        id: m.user_id,
        displayName: 'Utilizador',
        email: '',
        locale: 'pt-PT',
        timezone: 'Europe/Lisbon',
        createdAt: new Date().toISOString(),
      }
      return mapMember(m, profile)
    })
  }

  async addMember(member: Omit<FamilyMember, 'id' | 'profile'>): Promise<FamilyMember> {
    const { data: row, error } = await supabase
      .from('family_members')
      .insert({
        family_id: member.familyId,
        user_id: member.userId,
        role: member.role,
        invite_status: member.inviteStatus,
        color: member.color,
        can_approve: member.canApprove,
        can_request: member.canRequest,
        is_view_only: member.isViewOnly,
      })
      .select('*, profiles(*)')
      .single()
    if (error) throw new Error(error.message)

    const profileRow = row.profiles as Record<string, unknown>
    const profile = profileRow ? mapProfile(profileRow) : {
      id: member.userId,
      displayName: 'Utilizador',
      email: '',
      locale: 'pt-PT',
      timezone: 'Europe/Lisbon',
      createdAt: new Date().toISOString(),
    }
    return mapMember(row, profile)
  }

  async updateMember(id: string, data: Partial<FamilyMember>): Promise<FamilyMember> {
    const updates: Record<string, unknown> = {}
    if (data.role !== undefined) updates.role = data.role
    if (data.inviteStatus !== undefined) updates.invite_status = data.inviteStatus
    if (data.color !== undefined) updates.color = data.color
    if (data.canApprove !== undefined) updates.can_approve = data.canApprove
    if (data.canRequest !== undefined) updates.can_request = data.canRequest
    if (data.isViewOnly !== undefined) updates.is_view_only = data.isViewOnly

    const { data: row, error } = await supabase
      .from('family_members')
      .update(updates)
      .eq('id', id)
      .select('*, profiles(*)')
      .single()
    if (error) throw new Error(error.message)

    const profileRow = row.profiles as Record<string, unknown>
    const profile = profileRow ? mapProfile(profileRow) : {
      id: row.user_id,
      displayName: 'Utilizador',
      email: '',
      locale: 'pt-PT',
      timezone: 'Europe/Lisbon',
      createdAt: new Date().toISOString(),
    }
    return mapMember(row, profile)
  }

  async removeMember(id: string): Promise<void> {
    const { error } = await supabase.from('family_members').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
