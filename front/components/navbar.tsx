"use client"
import { Shield, Home, ArrowLeftRight, BarChart3, Plus, Minus, User } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from 'react'
import { SimpleWalletButton } from './simple-wallet-connect'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => setMounted(true), [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div
          className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between">
            <button onClick={() => router.push("/")} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold text-xl text-white tracking-wide">tZunami</span>
            </button>
            {pathname === "/" ? (
              <div className="flex items-center gap-2">
                <SimpleWalletButton />
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <button
                  onClick={() => router.push("/")}
                  className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
                <button
                  onClick={() => router.push("/deposit")}
                  className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
                >
                  <Plus className="w-4 h-4" />
                  Deposit
                </button>
                <button
                  onClick={() => router.push("/withdraw")}
                  className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
                >
                  <Minus className="w-4 h-4" />
                  Withdraw
                </button>
                <button
                  onClick={() => router.push("/swap")}
                  className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Swap
                </button>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => router.push("/kyc-test")}
                  className="flex items-center gap-2 text-sm transition-colors px-3 py-2 rounded-lg text-white hover:text-[#E8CFEA] hover:bg-white/10"
                >
                  <User className="w-4 h-4" />
                  KYC Test
                </button>
                <div className="flex items-center gap-2">
                  <SimpleWalletButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
