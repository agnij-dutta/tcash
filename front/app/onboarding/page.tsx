import dynamic from "next/dynamic"

const OnboardingPage = dynamic(() => import("@/components/onboarding-page"), {
  ssr: false,
  loading: () => (
    <div className="pt-24 md:pt-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-64 rounded-2xl bg-white/10 animate-pulse" />
      </div>
    </div>
  ),
})

export default function Onboarding() {
  return <OnboardingPage />
}
