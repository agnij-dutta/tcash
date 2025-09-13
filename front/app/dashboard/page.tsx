"use client"
import {
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Activity,
  DollarSign,
  Coins,
  Zap,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  Wallet,
  ArrowLeftRight,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useDirectEERC } from "@/hooks/useDirectEERC"
import { useHardcodedWallet } from "@/hooks/useHardcodedWallet"

type TokenRow = {
  symbol: string
  balance: number
  usd: number
  icon?: React.ComponentType<{ className?: string }>
}

export default function TsunamiDashboard() {
  const router = useRouter()
  const { address, isConnected } = useHardcodedWallet()
  const { 
    isInitialized, 
    isRegistered, 
    decryptedBalance, 
    balanceInTokens,
    privateTransfer,
    withdraw,
    deposit,
    refetchBalance
  } = useDirectEERC()
  
  const [showBalances, setShowBalances] = useState(true)
  const [hasZkAttestation, setHasZkAttestation] = useState<boolean>(true)
  const [stealthAddress, setStealthAddress] = useState<string>(
    address || "0x3a1f2b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f01"
  )

  // Convert decrypted balance to display format
  const balanceInTokensFormatted = useMemo(() => {
    if (!decryptedBalance) return 0
    return Number(decryptedBalance)
  }, [decryptedBalance])

  const tokens: TokenRow[] = [
    { symbol: "eUSDC", balance: balanceInTokensFormatted, usd: balanceInTokensFormatted, icon: DollarSign },
    { symbol: "eDAI", balance: 0, usd: 0, icon: Coins },
    { symbol: "eETH", balance: 0, usd: 0, icon: Zap },
  ]

  const totalUsd = useMemo(() => tokens.reduce((sum, t) => sum + t.usd, 0), [tokens])

  const recentActivity = [
    { type: "Deposit", detail: "Deposited 500 USDC → Minted eUSDC", status: "confirmed", time: "2h ago" },
    { type: "Private Swap", detail: "Swapped 200 eUSDC → 199 eDAI via Uniswap", status: "confirmed", time: "5h ago" },
    { type: "Withdraw", detail: "Withdrew 100 eDAI (Compliant proof provided)", status: "pending", time: "1d ago" },
  ] as const

  const obfuscate = (addr: string) => {
    if (!addr?.startsWith("0x") || addr.length < 6) return "0x***"
    return `${addr.slice(0, 4)}***${addr.slice(-4)}`
  }

  const rotateStealth = () => {
    // simple local rotation simulation
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    setStealthAddress((prev) => `0x${rand}${prev.slice(10)}`)
  }

  const goDeposit = () => router.push("/deposit")
  const goSwap = (prefill?: { from?: string; to?: string }) => {
    const params = new URLSearchParams()
    if (prefill?.from) params.set("from", prefill.from)
    if (prefill?.to) params.set("to", prefill.to)
    router.push(`/swap${params.toString() ? `?${params.toString()}` : ""}`)
  }
  const goWithdraw = () => router.push("/withdraw")

  // Analytics: compute allocation for pie chart
  const allocations = tokens.map((t) => ({ symbol: t.symbol, value: t.usd }))
  const totalAlloc = allocations.reduce((s, a) => s + a.value, 0)
  let cumulative = 0
  const segments = allocations.map((a, i) => {
    const start = (cumulative / totalAlloc) * 100
    const end = ((cumulative + a.value) / totalAlloc) * 100
    cumulative += a.value
    const colors = ["#8B5CF6", "#22C55E", "#F59E0B", "#06B6D4", "#EF4444"]
    return { start, end, color: colors[i % colors.length], label: a.symbol }
  })

  // Show loading state
  if (!isConnected) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col font-sans items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-white/60 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Initializing Wallet</h2>
          <p className="text-white/60 mb-6">Please wait while we initialize your wallet</p>
        </div>
      </div>
    )
  }

  // Show registration prompt
  if (!isRegistered && isInitialized) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col font-sans items-center justify-center">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 text-white/60 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Register for eERC</h2>
          <p className="text-white/60 mb-6">You need to register with the eERC protocol to start using private tokens</p>
          <button
            onClick={() => {}}
            className="px-6 py-3 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition-all"
          >
            Register Now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col font-sans">
      {/* Local metallic gradient defs */}
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="metallic-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#d4d4d4" />
            <stop offset="100%" stopColor="#737373" />
          </linearGradient>
        </defs>
      </svg>
      {/* Background image */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/back.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Dark overlay for better readability */}
      <div className="pointer-events-none absolute inset-0 bg-black/10" />

      {/* Header / Identity */}
      <header className="sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-4 py-3 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "transparent" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <span className="hidden xs:inline">Stealth:</span>
                <span className="font-mono text-white">{obfuscate(stealthAddress)}</span>
                <button
                  onClick={rotateStealth}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs text-white/90 border border-white/15"
                  title="Rotate / generate new stealth address"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Rotate
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasZkAttestation ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-yellow-200 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500/15 border border-yellow-500/40">
                  <AlertTriangle className="w-3.5 h-3.5" /> Unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* Quick Actions (Always Visible) */}
        <div className="sticky top-[72px] z-20">
          <div className="grid grid-cols-3 gap-3">
            <button onClick={goDeposit} className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition-all">
              <Wallet className="w-4 h-4" /> Deposit
            </button>
            <button onClick={() => goSwap()} className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 font-semibold hover:bg-white/15 transition-colors">
              <ArrowLeftRight className="w-4 h-4" /> Private Swap
            </button>
            <button onClick={goWithdraw} className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 font-semibold hover:bg-white/15 transition-colors">
              <ArrowUpRight className="w-4 h-4" /> Withdraw
            </button>
          </div>
        </div>

        {/* Balances Section */}
        <section className="backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_56px_rgba(0,0,0,0.45)]" style={{ background: "transparent" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent tracking-tight">Private Balances</h2>
            <button
              onClick={() => setShowBalances((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white/90 border border-white/15"
            >
              {showBalances ? "Hide" : "Show"}
            </button>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent tracking-tight">
            {showBalances ? `$${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "••••"}
          </div>
          <div className="mt-4 divide-y divide-white/10">
            {tokens.map((t) => (
              <div key={t.symbol} className="py-4 flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                    {t.icon ? <t.icon className="w-4 h-4 text-white" /> : <Coins className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="text-white font-medium">{t.symbol}</div>
                    <div className="text-xs text-white/70">
                      {showBalances ? `${t.balance} ${t.symbol}` : "••••"}
                    </div>
                  </div>
                </div>
                <div className="hidden sm:block text-white/85 text-sm min-w-[96px] text-right">
                  {showBalances ? `$${t.usd.toLocaleString()}` : "••••"}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={goDeposit} className="px-3 py-1.5 text-xs rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-white/90 hover:bg-white/15">
                    Deposit
                  </button>
                  <button onClick={() => goSwap({ from: t.symbol })} className="px-3 py-1.5 text-xs rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-white/90 hover:bg-white/15">
                    Swap
                  </button>
                  <button onClick={goWithdraw} className="px-3 py-1.5 text-xs rounded-md bg-[#e6ff55] text-[#0a0b0e] font-semibold hover:brightness-110 transition">
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Content Grid: Activity | Compliance & Limits | Analytics */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Activity Feed */}
          <section className="backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_56px_rgba(0,0,0,0.45)]" style={{ background: "transparent" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent tracking-tight">Recent Activity</h3>
              <Activity className="w-4 h-4 text-white/60" />
            </div>
            <div className="space-y-4">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                      {a.type === "Deposit" && <ArrowDownLeft className="w-4 h-4 text-emerald-300" />}
                      {a.type === "Private Swap" && <RefreshCw className="w-4 h-4 text-sky-300" />}
                      {a.type === "Withdraw" && <ArrowUpRight className="w-4 h-4 text-rose-300" />}
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">{a.detail}</div>
                      <div className="text-[11px] text-white/60">{a.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-white/60">{a.time}</div>
                    <div className={`text-xs font-medium ${a.status === "confirmed" ? "text-emerald-300" : "text-yellow-200"}`}>
                      {a.status === "confirmed" ? "confirmed" : "pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-white/10 border border-white/15 text-xs text-white/80 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" /> Private log. Stored locally only.
            </div>
          </section>

          {/* Right Column: Compliance & Analytics */}
          <div className="space-y-6">
            {/* Compliance & Limits */}
            <section className="backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_56px_rgba(0,0,0,0.45)]" style={{ background: "transparent" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent tracking-tight">Compliance & Limits</h3>
                {hasZkAttestation ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-yellow-200 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500/15 border border-yellow-500/40">
                    <AlertTriangle className="w-3.5 h-3.5" /> Action needed
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-sm text-white/85">
                <li>Withdrawals below $5,000 auto-approved.</li>
                <li>Above $5,000 → zk-attestation required.</li>
              </ul>
              <div className="mt-3 text-sm">
                {hasZkAttestation ? (
                  <span className="text-emerald-300">Ready for large withdrawals.</span>
                ) : (
                  <span className="text-yellow-200">Link zk-attestation to enable large withdrawals.</span>
                )}
              </div>
              {!hasZkAttestation && (
                <div className="mt-4">
                  <button
                    onClick={() => setHasZkAttestation(true)}
                    className="px-4 py-2 rounded-full bg-[#e6ff55] text-[#0a0b0e] text-sm font-bold hover:brightness-110 transition"
                  >
                    Provide zk-Attestation
                  </button>
                </div>
              )}
            </section>

            {/* Analytics (Optional) */}
            <section className="backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_56px_rgba(0,0,0,0.45)]" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent tracking-tight">Analytics</h3>
                <PieChart className="w-4 h-4 text-white/60" />
              </div>
              <div className="grid grid-cols-2 gap-4 items-center">
                {/* Pie */}
                <svg viewBox="0 0 32 32" className="w-28 h-28">
                  <circle cx="16" cy="16" r="16" fill="#14151a" />
                  {segments.map((s, i) => {
                    const a0 = (s.start / 100) * 2 * Math.PI
                    const a1 = (s.end / 100) * 2 * Math.PI
                    const x0 = 16 + 16 * Math.cos(a0)
                    const y0 = 16 + 16 * Math.sin(a0)
                    const x1 = 16 + 16 * Math.cos(a1)
                    const y1 = 16 + 16 * Math.sin(a1)
                    const large = s.end - s.start > 50 ? 1 : 0
                    const d = `M16,16 L${x0},${y0} A16,16 0 ${large} 1 ${x1},${y1} Z`
                    return <path key={i} d={d} fill={s.color} opacity={0.9} />
                  })}
                  {/* donut hole */}
                  <circle cx="16" cy="16" r="9" fill="#0a0b0e" />
                </svg>
                {/* Legend + Summary */}
                <div>
                  <div className="space-y-2 text-sm">
                    {segments.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                          <span className="text-white/80">{s.label}</span>
                        </div>
                        <span className="text-white/60">
                          {Math.round(((s.end - s.start) / 100) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-white/60">You swapped $12,400 privately this month</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
