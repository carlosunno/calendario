import type { Family, FamilyMember, Profile } from '@/types/domain'
import type { IFamilyRepository } from '../interfaces'
import { genId, lsAdd, lsGet, lsGetOne, lsUpdate, now } from './LocalStorage'

const FAMILIES_KEY = 'cal_families'
const MEMBERS_KEY = 'cal_members'
const USERS_KEY = 'cal_users'

const PARENT_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

export class LocalFamilyRepo implements IFamilyRepository {
  async getFamilies(userId: string): Promise<Family[]> {
    const members = lsGet<FamilyMember & { userId: string }>(MEMBERS_KEY)
    const familyIds = members.filter((m) => m.userId === userId && m.inviteStatus === 'aceite').map((m) => m.familyId)
    const families = lsGet<Family>(FAMILIES_KEY)
    return families.filter((f) => familyIds.includes(f.id))
  }

  async getFamily(id: string): Promise<Family | null> {
    return lsGetOne<Family>(FAMILIES_KEY, id)
  }

  async createFamily(data: Omit<Family, 'id' | 'createdAt' | 'updatedAt'>): Promise<Family> {
    const family: Family = { ...data, id: genId(), createdAt: now(), updatedAt: now() }
    return lsAdd(FAMILIES_KEY, family)
  }

  async updateFamily(id: string, data: Partial<Family>): Promise<Family> {
    return lsUpdate<Family>(FAMILIES_KEY, id, { ...data, updatedAt: now() })
  }

  async getMembers(familyId: string): Promise<FamilyMember[]> {
    const members = lsGet<FamilyMember & { userId: string }>(MEMBERS_KEY)
    const users = lsGet<Profile & { email: string }>(USERS_KEY)
    return members
      .filter((m) => m.familyId === familyId)
      .map((m, idx) => ({
        ...m,
        color: m.color ?? PARENT_COLORS[idx % PARENT_COLORS.length],
        profile: users.find((u) => u.id === m.userId) ?? {
          id: m.userId,
          displayName: 'Utilizador',
          email: '',
          locale: 'pt-PT',
          timezone: 'Europe/Lisbon',
          createdAt: now(),
        },
      }))
  }

  async addMember(member: Omit<FamilyMember, 'id' | 'profile'>): Promise<FamilyMember> {
    const members = lsGet<FamilyMember>(MEMBERS_KEY)
    const colorIdx = members.filter((m) => m.familyId === member.familyId).length
    const newMember = {
      ...member,
      id: genId(),
      color: PARENT_COLORS[colorIdx % PARENT_COLORS.length],
    } as FamilyMember
    lsAdd(MEMBERS_KEY, newMember)
    const users = lsGet<Profile>(USERS_KEY)
    return {
      ...newMember,
      profile: users.find((u) => u.id === member.userId) ?? {
        id: member.userId,
        displayName: 'Utilizador',
        email: '',
        locale: 'pt-PT',
        timezone: 'Europe/Lisbon',
        createdAt: now(),
      },
    }
  }

  async updateMember(id: string, data: Partial<FamilyMember>): Promise<FamilyMember> {
    return lsUpdate<FamilyMember>(MEMBERS_KEY, id, data)
  }

  async removeMember(id: string): Promise<void> {
    const members = lsGet<FamilyMember>(MEMBERS_KEY)
    const filtered = members.filter((m) => m.id !== id)
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(filtered))
  }
}
