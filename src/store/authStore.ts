import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile } from '@/types/domain'
import { authRepo } from '@/lib/repository'

interface AuthState {
  user: Profile | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  loginAs: (user: Profile) => void
  clearError: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      hydrate: () => {
        const user = authRepo.getCurrentUser()
        set({ user })
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const user = await authRepo.login(email, password)
          set({ user, isLoading: false })
        } catch (e) {
          set({ error: (e as Error).message, isLoading: false })
          throw e
        }
      },

      register: async (email, password, displayName) => {
        set({ isLoading: true, error: null })
        try {
          const user = await authRepo.register(email, password, displayName)
          set({ user, isLoading: false })
        } catch (e) {
          set({ error: (e as Error).message, isLoading: false })
          throw e
        }
      },

      logout: async () => {
        await authRepo.logout()
        set({ user: null })
      },

      loginAs: (user: Profile) => {
        authRepo.setSession(user)
        set({ user })
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'cal_auth_state', partialize: (s) => ({ user: s.user }) }
  )
)
