import type { Profile } from '@/types/domain'
import type { IAuthRepository } from '../interfaces'
import { supabase } from '@/lib/supabase/client'

const SESSION_KEY = 'cal_session'

export class SupabaseAuthRepo implements IAuthRepository {
  private _profile: Profile | null = null

  private _profileFromUser(user: { id: string; email?: string; created_at: string; user_metadata?: Record<string, unknown> }): Profile {
    return {
      id: user.id,
      displayName: (user.user_metadata?.displayName as string) ?? (user.email?.split('@')[0] ?? 'Utilizador'),
      email: user.email ?? '',
      locale: 'pt-PT',
      timezone: 'Europe/Lisbon',
      createdAt: user.created_at,
    }
  }

  async login(email: string, password: string): Promise<Profile> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    const profile = this._profileFromUser(data.user)
    this._profile = profile
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
    return profile
  }

  async register(email: string, password: string, displayName: string): Promise<Profile> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { displayName } },
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Erro ao criar conta')
    if (!data.session) throw new Error('Confirme o seu email antes de entrar.')

    const profile = this._profileFromUser({ ...data.user, user_metadata: { displayName } })
    this._profile = profile
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
    return profile
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut()
    this._profile = null
    localStorage.removeItem(SESSION_KEY)
  }

  getCurrentUser(): Profile | null {
    if (this._profile) return this._profile
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as Profile) : null
    } catch {
      return null
    }
  }

  setSession(user: Profile): void {
    this._profile = user
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const dbUpdates: Record<string, unknown> = {}
    if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone
    if (updates.locale !== undefined) dbUpdates.locale = updates.locale
    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)

    const profile: Profile = {
      id: data.id,
      displayName: data.display_name,
      email: data.email,
      avatarUrl: data.avatar_url,
      phone: data.phone,
      locale: data.locale,
      timezone: data.timezone,
      createdAt: data.created_at,
    }
    this._profile = profile
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
    return profile
  }

  getAllUsers(): Array<Profile & { email: string; password: string }> {
    const current = this.getCurrentUser()
    return current ? [{ ...current, password: '' }] : []
  }

  async deleteUser(_userId: string): Promise<void> {
    throw new Error('Operação não disponível no modo Supabase')
  }
}
