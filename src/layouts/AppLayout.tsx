import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  activeIcon: ReactNode
}

function CalendarIcon({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v14a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
    </svg>
  ) : (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
    </svg>
  )
}

function HomeIcon({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
    </svg>
  ) : (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
    </svg>
  )
}

function BellIcon({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h16a1 1 0 00.707-1.707L20 11.586V8a6 6 0 00-6-6H10z"/>
      <path d="M10 18a3 3 0 006 0H10z"/>
    </svg>
  ) : (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
    </svg>
  )
}

function UsersIcon({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
    </svg>
  ) : (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  )
}

function ExpenseIcon({ filled }: { filled?: boolean }) {
  return filled ? (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5v.5a1 1 0 11-2 0v-.5A2.5 2.5 0 019.5 14H9a1 1 0 110-2h.5a.5.5 0 000-1h-1a2.5 2.5 0 010-5V5.5a1 1 0 112 0V6h.5a2.5 2.5 0 012.45 2H13a1 1 0 110 2h-.5a.5.5 0 000 1h1a2.5 2.5 0 01.5 4.95V16.5z"/>
    </svg>
  ) : (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { activeFamily, reset } = useAppStore()
  const { logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    reset()
    navigate('/login', { replace: true })
  }

  const navItems: NavItem[] = [
    {
      to: '/dashboard',
      label: 'Início',
      icon: <HomeIcon />,
      activeIcon: <HomeIcon filled />,
    },
    {
      to: '/calendar',
      label: 'Calendário',
      icon: <CalendarIcon />,
      activeIcon: <CalendarIcon filled />,
    },
    {
      to: '/exceptions',
      label: 'Pedidos',
      icon: <BellIcon />,
      activeIcon: <BellIcon filled />,
    },
    {
      to: '/expenses',
      label: 'Despesas',
      icon: <ExpenseIcon />,
      activeIcon: <ExpenseIcon filled />,
    },
    {
      to: '/family',
      label: 'Família',
      icon: <UsersIcon />,
      activeIcon: <UsersIcon filled />,
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="text-base font-bold text-gray-900">Calendário Familiar</h1>
          {activeFamily && (
            <p className="text-xs text-gray-500">{activeFamily.name}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <NavLink to="/settings" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            title="Terminar sessão"
            className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-30">
        <div className="flex items-center justify-around px-2 pt-2 pb-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-0 flex-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {isActive ? item.activeIcon : item.icon}
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
