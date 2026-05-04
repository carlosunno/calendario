import type { ReactNode } from 'react'

interface OnboardingLayoutProps {
  children: ReactNode
  currentStep: number
  totalSteps: number
  title: string
  subtitle?: string
}

export function OnboardingLayout({ children, currentStep, totalSteps, title, subtitle }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full p-4">
        {/* Progress */}
        <div className="pt-6 pb-4">
          <div className="flex items-center gap-2 mb-4">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                  i < currentStep ? 'bg-blue-600' : i === currentStep ? 'bg-blue-400' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-blue-600 font-medium">Passo {currentStep + 1} de {totalSteps}</p>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl p-6 animate-slide-up">
          {children}
        </div>
      </div>
    </div>
  )
}
