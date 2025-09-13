"use client"
import { Shield, Home, ArrowLeftRight, BarChart3, Plus, Minus, User } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Navbar() {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Full-width glass bar */}
      <div
        className="w-full backdrop-blur-3xl backdrop-saturate-200 border-b border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_8px_24px_rgba(0,0,0,0.35)]"
        style={{ background: "rgba(0,0,0,0.7)" }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FF9FFC] flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-xl text-white tracking-wide">tZunami</span>
          </button>

          <nav className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-md text-white hover:text-[#FF9FFC] hover:bg-white/10"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
            <button
              onClick={() => router.push("/deposit")}
              className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-md text-white hover:text-[#FF9FFC] hover:bg-white/10"
            >
              <Plus className="w-4 h-4" />
              Deposit
            </button>
            <button
              onClick={() => router.push("/withdraw")}
              className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-md text-white hover:text-[#FF9FFC] hover:bg-white/10"
            >
              <Minus className="w-4 h-4" />
              Withdraw
            </button>
            <button
              onClick={() => router.push("/swap")}
              className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-md text-white hover:text-[#FF9FFC] hover:bg-white/10"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Swap
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-md text-white hover:text-[#FF9FFC] hover:bg-white/10"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => router.push("/onboarding")}
              className="flex items-center gap-2 text-sm transition-colors px-4 py-2 rounded-md bg-[#FF9FFC] text-black hover:bg-[#B19EEF] hover:text-white font-medium"
            >
              <User className="w-4 h-4" />
              Get Started
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}
