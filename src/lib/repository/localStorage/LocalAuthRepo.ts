import type { Profile } from '@/types/domain'
import type { IAuthRepository } from '../interfaces'
import { genId, lsAdd, lsGet, lsUpdate, now } from './LocalStorage'

const USERS_KEY = 'cal_users'
const PASSWORDS_KEY = 'cal_passwords'
const SESSION_KEY = 'cal_session'

interface StoredUser extends Profile {
  email: string
}

interface StoredPassword {
  id: string
  userId: string
  hash: string // In real app this would be hashed; for MVP we store as-is
}

export class LocalAuthRepo implements IAuthRepository {
  async login(email: string, password: string): Promise<Profile> {
    const users = lsGet<StoredUser>(USERS_KEY)
    const user = users.find((u) => u.email === email)
    if (!user) throw new Error('Utilizador não encontrado')

    const passwords = lsGet<StoredPassword>(PASSWORDS_KEY)
    const pw = passwords.find((p) => p.userId === user.id)
    if (!pw || pw.hash !== password) throw new Error('Palavra-passe incorreta')

    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    return user
  }

  async register(email: string, password: string, displayName: string): Promise<Profile> {
    const users = lsGet<StoredUser>(USERS_KEY)
    if (users.some((u) => u.email === email)) {
      throw new Error('Email já registado')
    }

    const profile: StoredUser = {
      id: genId(),
      email,
      displayName,
      locale: 'pt-PT',
      timezone: 'Europe/Lisbon',
      createdAt: now(),
    }

    lsAdd(USERS_KEY, profile)
    lsAdd<StoredPassword>(PASSWORDS_KEY, { id: genId(), userId: profile.id, hash: password })
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile))
    return profile
  }

  async logout(): Promise<void> {
    localStorage.removeItem(SESSION_KEY)
  }

  setSession(user: Profile): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }

  getAllUsers(): Array<Profile & { email: string; password: string }> {
    const users = lsGet<Profile & { email: string }>(USERS_KEY)
    const passwords = lsGet<{ id: string; userId: string; hash: string }>(PASSWORDS_KEY)
    return users.map((u) => ({
      ...u,
      password: passwords.find((p) => p.userId === u.id)?.hash ?? '',
    }))
  }

  getCurrentUser(): Profile | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as Profile) : null
    } catch {
      return null
    }
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const updated = lsUpdate<StoredUser>(USERS_KEY, userId, updates)
    const current = this.getCurrentUser()
    if (current?.id === userId) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...updates }))
    }
    return updated
  }
}
