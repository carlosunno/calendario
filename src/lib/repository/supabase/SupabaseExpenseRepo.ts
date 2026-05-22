import type { Expense } from '@/types/domain'
import type { IExpenseRepository } from '../interfaces'
import { supabase } from '@/lib/supabase/client'

function mapExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    familyId: row.family_id as string,
    childId: row.child_id as string | undefined,
    description: row.description as string,
    amount: Number(row.amount),
    date: row.date as string,
    category: row.category as Expense['category'],
    paidBy: row.paid_by as string,
    splitType: row.split_type as Expense['splitType'],
    splitRatio: Number(row.split_ratio),
    status: row.status as Expense['status'],
    confirmedBy: row.confirmed_by as string | undefined,
    confirmedAt: row.confirmed_at as string | undefined,
    notes: row.notes as string | undefined,
    receipts: row.receipts as string[] | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export class SupabaseExpenseRepo implements IExpenseRepository {
  async getExpenses(familyId: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('family_id', familyId)
      .order('date', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapExpense)
  }

  async getExpense(id: string): Promise<Expense | null> {
    const { data, error } = await supabase.from('expenses').select('*').eq('id', id).single()
    if (error) return null
    return mapExpense(data)
  }

  async createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    const { data: row, error } = await supabase
      .from('expenses')
      .insert({
        family_id: data.familyId,
        child_id: data.childId ?? null,
        description: data.description,
        amount: data.amount,
        date: data.date,
        category: data.category,
        paid_by: data.paidBy,
        split_type: data.splitType,
        split_ratio: data.splitRatio,
        status: data.status,
        confirmed_by: data.confirmedBy ?? null,
        confirmed_at: data.confirmedAt ?? null,
        notes: data.notes ?? null,
        receipts: data.receipts ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapExpense(row)
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.description !== undefined) updates.description = data.description
    if (data.amount !== undefined) updates.amount = data.amount
    if (data.date !== undefined) updates.date = data.date
    if (data.category !== undefined) updates.category = data.category
    if (data.paidBy !== undefined) updates.paid_by = data.paidBy
    if (data.splitType !== undefined) updates.split_type = data.splitType
    if (data.splitRatio !== undefined) updates.split_ratio = data.splitRatio
    if (data.status !== undefined) updates.status = data.status
    if (data.confirmedBy !== undefined) updates.confirmed_by = data.confirmedBy
    if (data.confirmedAt !== undefined) updates.confirmed_at = data.confirmedAt
    if (data.notes !== undefined) updates.notes = data.notes
    if (data.receipts !== undefined) updates.receipts = data.receipts
    if (data.childId !== undefined) updates.child_id = data.childId

    const { data: row, error } = await supabase.from('expenses').update(updates).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return mapExpense(row)
  }

  async deleteExpense(id: string): Promise<void> {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
