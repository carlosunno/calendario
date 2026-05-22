import { SupabaseAuthRepo } from './supabase/SupabaseAuthRepo'
import { SupabaseFamilyRepo } from './supabase/SupabaseFamilyRepo'
import { SupabaseChildRepo, SupabaseRegimeRepo } from './supabase/SupabaseChildRepo'
import { SupabaseExceptionRepo } from './supabase/SupabaseExceptionRepo'
import { SupabaseNoteRepo } from './supabase/SupabaseNoteRepo'
import { SupabaseVacationRepo } from './supabase/SupabaseVacationRepo'
import { SupabaseExpenseRepo } from './supabase/SupabaseExpenseRepo'

export const authRepo = new SupabaseAuthRepo()
export const familyRepo = new SupabaseFamilyRepo()
export const childRepo = new SupabaseChildRepo()
export const regimeRepo = new SupabaseRegimeRepo()
export const exceptionRepo = new SupabaseExceptionRepo()
export const noteRepo = new SupabaseNoteRepo()
export const vacationRepo = new SupabaseVacationRepo()
export const expenseRepo = new SupabaseExpenseRepo()
