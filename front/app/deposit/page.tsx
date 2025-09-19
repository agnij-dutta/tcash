import dynamic from "next/dynamic"

const DepositPage = dynamic(() => import("@/components/deposit-page"), {
  ssr: false,
  loading: () => (
    <div className="pt-24 md:pt-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-40 rounded-2xl bg-white/10 animate-pulse" />
      </div>
    </div>
  ),
})

export default function Deposit() {
  return (
    <div className="pt-24 md:pt-28">
      <DepositPage />
    </div>
  )
}
