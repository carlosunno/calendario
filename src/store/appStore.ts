import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Child, Family, FamilyMember } from '@/types/domain'

interface AppState {
  activeFamily: Family | null
  activeFamilyMembers: FamilyMember[]
  children: Child[]
  selectedChildId: string | null
  hasCompletedOnboarding: boolean

  setActiveFamily: (family: Family, members: FamilyMember[], children: Child[]) => void
  setChildren: (children: Child[]) => void
  setSelectedChild: (childId: string | null) => void
  setOnboardingComplete: (v: boolean) => void
  reset: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeFamily: null,
      activeFamilyMembers: [],
      children: [],
      selectedChildId: null,
      hasCompletedOnboarding: false,

      setActiveFamily: (family, members, children) =>
        set({ activeFamily: family, activeFamilyMembers: members, children }),

      setChildren: (children) => set({ children }),

      setSelectedChild: (childId) => set({ selectedChildId: childId }),

      setOnboardingComplete: (v) => set({ hasCompletedOnboarding: v }),

      reset: () =>
        set({
          activeFamily: null,
          activeFamilyMembers: [],
          children: [],
          selectedChildId: null,
          hasCompletedOnboarding: false,
        }),
    }),
    {
      name: 'cal_app_state',
      partialize: (s) => ({
        activeFamily: s.activeFamily,
        activeFamilyMembers: s.activeFamilyMembers,
        children: s.children,
        selectedChildId: s.selectedChildId,
        hasCompletedOnboarding: s.hasCompletedOnboarding,
      }),
    }
  )
)
