import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { OnboardingLayout } from '@/layouts/OnboardingLayout'
import { useAuthStore } from '@/store/authStore'
import { useAppStore } from '@/store/appStore'
import { familyRepo } from '@/lib/repository'
import { FamilyStep } from './FamilyStep'
import { ChildrenStep } from './ChildrenStep'
import { RegimeStep } from './RegimeStep'
import { InviteStep } from './InviteStep'
import type { Child, CustodyRegime, Family } from '@/types/domain'
import { showToast } from '@/ui/Toast'

interface WizardData {
  family?: Family
  children: Child[]
  regime?: CustodyRegime
}

const STEPS = [
  { title: 'A sua família', subtitle: 'Crie o agregado familiar' },
  { title: 'Os seus filhos', subtitle: 'Adicione os filhos que vai gerir' },
  { title: 'Regime de custódia', subtitle: 'Como é organizada a custódia?' },
  { title: 'Convidar co-pai/mãe', subtitle: 'Convide o outro responsável (opcional)' },
]

export function OnboardingWizard() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>({ children: [] })
  const [loading, setLoading] = useState(false)
  const { user } = useAuthStore()
  const { setActiveFamily, setOnboardingComplete } = useAppStore()
  const navigate = useNavigate()

  function next() { setStep((s) => Math.min(s + 1, STEPS.length - 1)) }
  function back() { setStep((s) => Math.max(s - 1, 0)) }

  async function handleFamilyDone(family: Family, children: Child[]) {
    setData((d) => ({ ...d, family, children }))
    next()
  }

  async function handleChildrenDone(children: Child[]) {
    setData((d) => ({ ...d, children }))
    next()
  }

  async function handleRegimeDone(regime: CustodyRegime) {
    setData((d) => ({ ...d, regime }))
    next()
  }

  async function handleFinish() {
    if (!data.family || !user) return
    setLoading(true)
    try {
      const members = await familyRepo.getMembers(data.family.id)
      setActiveFamily(data.family, members, data.children)
      setOnboardingComplete(true)
      navigate('/dashboard', { replace: true })
    } catch {
      showToast('Erro ao finalizar configuração', 'error')
    } finally {
      setLoading(false)
    }
  }

  const currentStep = STEPS[step]

  return (
    <OnboardingLayout
      currentStep={step}
      totalSteps={STEPS.length}
      title={currentStep.title}
      subtitle={currentStep.subtitle}
    >
      {step === 0 && (
        <FamilyStep
          userId={user!.id}
          onDone={handleFamilyDone}
        />
      )}
      {step === 1 && data.family && (
        <ChildrenStep
          familyId={data.family.id}
          initialChildren={data.children}
          onDone={handleChildrenDone}
          onBack={back}
        />
      )}
      {step === 2 && data.family && data.children.length > 0 && (
        <RegimeStep
          family={data.family}
          children={data.children}
          userId={user!.id}
          onDone={handleRegimeDone}
          onBack={back}
        />
      )}
      {step === 3 && (
        <InviteStep
          familyId={data.family?.id ?? ''}
          onFinish={handleFinish}
          onBack={back}
          loading={loading}
        />
      )}
    </OnboardingLayout>
  )
}
