import type { Profile } from '@/types/domain'
import type { IAuthRepository } from '../interfaces'
import { supabase } from '@/lib/supabase/client'

const SESSION_KEY = 'cal_session'

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

export class SupabaseAuthRepo implements IAuthRepository {
  private _profile: Profile | null = null

  constructor() {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await this._syncProfile(session.user.id)
      } else {
        this._profile = null
        localStorage.removeItem(SESSION_KEY)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) this._syncProfile(data.session.user.id)
    })
  }

  private async _syncProfile(userId: string): Promise<void> {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      this._profile = mapProfile(data)
      localStorage.setItem(SESSION_KEY, JSON.stringify(this._profile))
    }
  }

  async login(email: string, password: string): Promise<Profile> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    if (profileError) throw new Error(profileError.message)

    this._profile = mapProfile(profile)
    localStorage.setItem(SESSION_KEY, JSON.stringify(this._profile))
    return this._profile
  }

  async register(email: string, password: string, displayName: string): Promise<Profile> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { displayName } },
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Erro ao criar conta')
    if (!data.session) throw new Error('Erro ao criar sessão. Tenta novamente.')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, display_name: displayName, email })
      .select()
      .single()
    if (profileError) throw new Error(profileError.message)

    this._profile = mapProfile(profile)
    localStorage.setItem(SESSION_KEY, JSON.stringify(this._profile))
    return this._profile
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

    const profile = mapProfile(data)
    if (this._profile?.id === userId) {
      this._profile = profile
      localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
    }
    return profile
  }

  // Admin-only: not available in Supabase implementation
  getAllUsers(): Array<Profile & { email: string; password: string }> {
    const current = this.getCurrentUser()
    return current ? [{ ...current, password: '' }] : []
  }

  async deleteUser(_userId: string): Promise<void> {
    // Requires service role — not exposed in frontend
    throw new Error('Operação não disponível no modo Supabase')
  }
}
