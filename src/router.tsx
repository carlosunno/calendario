import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthGuard } from '@/features/auth/components/AuthGuard'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { CalendarPage } from '@/features/calendar/pages/CalendarPage'
import { ExceptionsPage } from '@/features/exceptions/pages/ExceptionsPage'
import { ExceptionNewPage } from '@/features/exceptions/pages/ExceptionNewPage'
import { ExceptionDetailPage } from '@/features/exceptions/pages/ExceptionDetailPage'
import { NotesPage } from '@/features/notes/pages/NotesPage'
import { NoteNewPage } from '@/features/notes/pages/NoteNewPage'
import { NoteDetailPage } from '@/features/notes/pages/NoteDetailPage'
import { VacationsPage } from '@/features/vacations/pages/VacationsPage'
import { VacationNewPage } from '@/features/vacations/pages/VacationNewPage'
import { FamilyPage } from '@/features/family/pages/FamilyPage'
import { RegimeUpdatePage } from '@/features/family/pages/RegimeUpdatePage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { AdminPage } from '@/features/admin/pages/AdminPage'

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    path: '/onboarding',
    element: (
      <AuthGuard>
        <OnboardingWizard />
      </AuthGuard>
    ),
  },
  { path: '/dashboard', element: <Protected><DashboardPage /></Protected> },
  { path: '/calendar', element: <Protected><CalendarPage /></Protected> },
  { path: '/exceptions', element: <Protected><ExceptionsPage /></Protected> },
  { path: '/exceptions/new', element: <Protected><ExceptionNewPage /></Protected> },
  { path: '/exceptions/:id', element: <Protected><ExceptionDetailPage /></Protected> },
  { path: '/notes', element: <Protected><NotesPage /></Protected> },
  { path: '/notes/new', element: <Protected><NoteNewPage /></Protected> },
  { path: '/notes/:id', element: <Protected><NoteDetailPage /></Protected> },
  { path: '/vacations', element: <Protected><VacationsPage /></Protected> },
  { path: '/vacations/new', element: <Protected><VacationNewPage /></Protected> },
  { path: '/family', element: <Protected><FamilyPage /></Protected> },
  { path: '/family/regimes/:id/actualizar', element: <Protected><RegimeUpdatePage /></Protected> },
  { path: '/settings', element: <Protected><SettingsPage /></Protected> },
  { path: '/admin', element: <Protected><AdminPage /></Protected> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
