import { LocalAuthRepo } from './localStorage/LocalAuthRepo'
import { LocalChildRepo, LocalRegimeRepo } from './localStorage/LocalChildRepo'
import { LocalExceptionRepo, LocalNoteRepo, LocalVacationRepo, LocalExpenseRepo } from './localStorage/LocalExceptionRepo'
import { LocalFamilyRepo } from './localStorage/LocalFamilyRepo'

// Swap these implementations when a real backend is ready
export const authRepo = new LocalAuthRepo()
export const familyRepo = new LocalFamilyRepo()
export const childRepo = new LocalChildRepo()
export const regimeRepo = new LocalRegimeRepo()
export const exceptionRepo = new LocalExceptionRepo()
export const noteRepo = new LocalNoteRepo()
export const vacationRepo = new LocalVacationRepo()
export const expenseRepo = new LocalExpenseRepo()
