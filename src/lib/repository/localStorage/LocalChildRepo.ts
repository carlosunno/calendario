import type { Child, CustodyRegime } from '@/types/domain'
import type { IChildRepository, IRegimeRepository } from '../interfaces'
import { genId, lsAdd, lsGet, lsGetOne, lsUpdate, now } from './LocalStorage'

const CHILDREN_KEY = 'cal_children'
const REGIMES_KEY = 'cal_regimes'

export class LocalChildRepo implements IChildRepository {
  async getChildren(familyId: string): Promise<Child[]> {
    return lsGet<Child>(CHILDREN_KEY).filter((c) => c.familyId === familyId)
  }

  async getChild(id: string): Promise<Child | null> {
    return lsGetOne<Child>(CHILDREN_KEY, id)
  }

  async createChild(data: Omit<Child, 'id' | 'createdAt'>): Promise<Child> {
    const child: Child = { ...data, id: genId(), createdAt: now() }
    return lsAdd(CHILDREN_KEY, child)
  }

  async updateChild(id: string, data: Partial<Child>): Promise<Child> {
    return lsUpdate<Child>(CHILDREN_KEY, id, data)
  }

  async deleteChild(id: string): Promise<void> {
    const children = lsGet<Child>(CHILDREN_KEY).filter((c) => c.id !== id)
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children))
  }
}

export class LocalRegimeRepo implements IRegimeRepository {
  async getRegimes(familyId: string): Promise<CustodyRegime[]> {
    return lsGet<CustodyRegime>(REGIMES_KEY).filter((r) => r.familyId === familyId)
  }

  async getRegime(id: string): Promise<CustodyRegime | null> {
    return lsGetOne<CustodyRegime>(REGIMES_KEY, id)
  }

  async createRegime(data: Omit<CustodyRegime, 'id' | 'createdAt'>): Promise<CustodyRegime> {
    const regime: CustodyRegime = { ...data, id: genId(), createdAt: now() }
    return lsAdd(REGIMES_KEY, regime)
  }

  async updateRegime(id: string, data: Partial<CustodyRegime>): Promise<CustodyRegime> {
    return lsUpdate<CustodyRegime>(REGIMES_KEY, id, data)
  }

  async deleteRegime(id: string): Promise<void> {
    const regimes = lsGet<CustodyRegime>(REGIMES_KEY).filter((r) => r.id !== id)
    localStorage.setItem(REGIMES_KEY, JSON.stringify(regimes))
  }
}
