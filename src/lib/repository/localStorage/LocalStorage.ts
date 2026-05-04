export function lsGet<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

export function lsGetOne<T>(key: string, id: string): T | null {
  const items = lsGet<T & { id: string }>(key)
  return items.find((i) => i.id === id) ?? null
}

export function lsSave<T extends { id: string }>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

export function lsAdd<T extends { id: string }>(key: string, item: T): T {
  const items = lsGet<T>(key)
  items.push(item)
  lsSave(key, items)
  return item
}

export function lsUpdate<T extends { id: string }>(key: string, id: string, data: Partial<T>): T {
  const items = lsGet<T>(key)
  const idx = items.findIndex((i) => i.id === id)
  if (idx === -1) throw new Error(`Item ${id} não encontrado em ${key}`)
  items[idx] = { ...items[idx], ...data }
  lsSave(key, items)
  return items[idx]
}

export function lsDelete(key: string, id: string): void {
  const items = lsGet<{ id: string }>(key)
  lsSave(key, items.filter((i) => i.id !== id))
}

export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function now(): string {
  return new Date().toISOString()
}
