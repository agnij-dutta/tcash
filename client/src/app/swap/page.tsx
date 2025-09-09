"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowUpDown, ChevronDown, TrendingUp, Shield, RotateCcw, Settings, X, Search, CheckCircle2, AlertTriangle } from "lucide-react"

export default function TsunamiSwap() {
  // Simple demo token list
  const tokenList = useMemo(
    () => [
      { symbol: "eUSDC", name: "Encrypted USD Coin", balance: 23489.89 },
      { symbol: "eDAI", name: "Encrypted DAI", balance: 12045.12 },
      { symbol: "BNB", name: "BNB", balance: 5695.89 },
      { symbol: "USDT", name: "Tether", balance: 7575.93 },
    ],
    []
  )

  // Selection + amounts
  const [fromToken, setFromToken] = useState(tokenList[0]) // eUSDC
  const [toToken, setToToken] = useState(tokenList[1]) // eDAI
  const [fromAmount, setFromAmount] = useState<string>("")
  const [toAmount, setToAmount] = useState<string>("")
  const [insufficientBalance, setInsufficientBalance] = useState(false)

  // UI state
  const [selectingSide, setSelectingSide] = useState<"from" | "to" | null>(null)
  const [tokenQuery, setTokenQuery] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [slippage, setSlippage] = useState(0.5)
  const [isSwapping, setIsSwapping] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([])

  // Derived quote (fake pricing)
  const price = useMemo(() => {
    // simple mock: 1 eUSDC = 0.99 eDAI, otherwise 1:1
    if (fromToken.symbol === "eUSDC" && toToken.symbol === "eDAI") return 0.99
    if (fromToken.symbol === "eDAI" && toToken.symbol === "eUSDC") return 1 / 0.99
    return 1
  }, [fromToken, toToken])

  useEffect(() => {
    const amt = parseFloat(fromAmount.replace(/,/g, ""))
    if (!isFinite(amt) || amt <= 0) {
      setToAmount("")
      setInsufficientBalance(false)
      return
    }
    const est = amt * price
    setToAmount(est.toLocaleString(undefined, { maximumFractionDigits: 6 }))
    setInsufficientBalance(amt > fromToken.balance)
  }, [fromAmount, price, fromToken])

  const filteredTokens = useMemo(() => {
    const q = tokenQuery.trim().toLowerCase()
    if (!q) return tokenList
    return tokenList.filter(
      (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    )
  }, [tokenList, tokenQuery])

  function openTokenModal(side: "from" | "to") {
    setSelectingSide(side)
    setTokenQuery("")
  }

  function selectToken(t: (typeof tokenList)[number]) {
    if (selectingSide === "from") {
      setFromToken(t)
    } else if (selectingSide === "to") {
      setToToken(t)
    }
    setSelectingSide(null)
  }

  function flipDirection() {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
  }

  function addToast(message: string) {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }

  async function onSwap() {
    setErrorMessage(null)
    const amt = parseFloat(fromAmount.replace(/,/g, ""))
    if (!isFinite(amt) || amt <= 0) {
      setErrorMessage("Enter a valid amount")
      return
    }
    if (insufficientBalance) {
      setErrorMessage("Insufficient balance")
      return
    }

    try {
      setIsSwapping(true)
      addToast("Generating zk proof...")
      await new Promise((r) => setTimeout(r, 1000))
      addToast("Proof generated successfully")
      await new Promise((r) => setTimeout(r, 800))
      addToast("Transaction submitted to PrivacyRouter")
      await new Promise((r) => setTimeout(r, 700))
      setIsSwapping(false)
      setSuccessOpen(true)
    } catch (e) {
      setIsSwapping(false)
      setErrorMessage("Swap failed: Insufficient liquidity")
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center">
      {/* Background image */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/back.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      />
      {/* Dark overlay for better readability */}
      <div className="pointer-events-none absolute inset-0 bg-black/40" />

      {/* Stepper */}
      <div className="pt-8 mb-6 relative z-10">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl px-4 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
              <span className="text-black text-sm font-bold">1</span>
            </div>
            <span className="text-white text-base font-semibold">Select tokens</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/10 flex items-center justify-center">
            <span className="text-white/80 text-sm font-medium">2</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/10 flex items-center justify-center">
            <span className="text-white/80 text-sm font-medium">3</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/10 flex items-center justify-center">
            <span className="text-white/80 text-sm font-medium">4</span>
          </div>
          </div>
        </div>

      {/* Main Swap Card */}
      <div className="w-full max-w-6xl mx-auto px-4 pb-10 relative z-10">
        {/* Glass wrapper with subtle gradient sheen */}
        <div className="relative rounded-[32px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.50)]">
          <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_40%,rgba(255,255,255,0.02)_100%)]" />
          <div className="relative bg-white/5 backdrop-blur-2xl backdrop-saturate-150 border border-white/10 rounded-[32px] p-5 sm:p-6 lg:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_48px_rgba(0,0,0,0.45)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <button className="text-white text-xl font-bold tracking-wide">Swap</button>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5">
                <RotateCcw className="w-5 h-5 text-white/60" />
              </button>
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/5">
                <Settings className="w-5 h-5 text-white/60" />
              </button>
            </div>
          </div>
          <div className="text-white/70 text-base font-medium mb-8">Private token swaps powered by Tsunami & Uniswap v4</div>

          {errorMessage && (
            <div className="mb-6 flex items-center gap-3 bg-rose-500/15 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-base font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Content grid */}
          <div className="relative">
            {/* vertical divider */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/10" />

            <div className="grid md:grid-cols-2 gap-6">
              {/* From Section */}
              <div className="">
                <label className="text-white/80 text-base font-semibold mb-3 block">From:</label>
                <div className="text-sm text-white/70 mb-3 font-medium">Balance: {fromToken.balance.toLocaleString()} {fromToken.symbol}</div>

                {/* Token / Network pill */}
                <button onClick={() => openTokenModal("from")} className="w-full text-left bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between mb-5 hover:bg-white/10 transition-colors shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex items-center gap-4">
                    <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-black text-sm font-bold">{fromToken.symbol[0]}</span>
                    </div>
                    <span className="text-white text-lg font-semibold">{fromToken.symbol}</span>
                    <span className="text-white/40">/</span>
                    <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-full px-3 py-1 flex items-center gap-2">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full" />
                      <span className="text-emerald-200 text-sm font-medium">Shielded</span>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/70" />
                </button>

                {/* Amount card */}
                <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.35)] p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/80 text-base font-semibold">You send:</span>
                  
                  </div>
                  <div className="text-center">
                    <input
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="0.0"
                      className="w-full bg-transparent outline-none text-center text-[44px] sm:text-[48px] leading-[1.1] font-bold text-white tracking-tight"
                      inputMode="decimal"
                    />
                    <div className="text-rose-300 text-base font-medium mt-2">{insufficientBalance ? "Insufficient balance" : ""}</div>
                  </div>
                </div>
              </div>

              {/* To Section */}
              <div className="">
                <label className="text-white/80 text-base font-semibold mb-3 block">To:</label>
                <div className="text-sm text-white/70 mb-3 font-medium">Balance: {toToken.balance.toLocaleString()} {toToken.symbol}</div>

                {/* Token / Network pill */}
                <button onClick={() => openTokenModal("to")} className="w-full text-left bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between mb-5 hover:bg-white/10 transition-colors shadow-[inset_0_-1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex items-center gap-4">
                    <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{toToken.symbol[0]}</span>
                    </div>
                    <span className="text-white text-lg font-semibold">{toToken.symbol}</span>
                    <span className="text-white/40">/</span>
                    <div className="bg-rose-500/20 border border-rose-500/50 rounded-full px-3 py-1 flex items-center gap-2">
                      <div className="w-3 h-3 bg-rose-400 rounded-full" />
                      <span className="text-rose-200 text-sm font-medium">Shielded</span>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white/70" />
                </button>

                {/* Amount card */}
                <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_8px_24px_rgba(0,0,0,0.35)] p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/80 text-base font-semibold">You receive:</span>
                    <span className="text-white/70 text-sm font-medium">Estimated</span>
                  </div>
                  <div className="text-center">
                    <div className="text-[44px] sm:text-[48px] leading-[1.1] font-bold text-white tracking-tight">{toAmount || "0.0"}</div>
                   
                  </div>
                </div>
              </div>
            </div>

            {/* Center swap button overlapping the divider */}
            <div className="hidden md:flex items-center justify-center">
              <button onClick={flipDirection} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-full flex items-center justify-center hover:-translate-y-[calc(50%+2px)] transition-all duration-200 group shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                <ArrowUpDown className="w-5 h-5 text-white/65 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>

          {/* Footer: price info and button */}
          <div className="mt-8 flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-white text-base font-semibold">1 {fromToken.symbol} = {price.toFixed(6)} {toToken.symbol}</span>
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-300 text-base font-semibold">5.62% (24H)</span>
              </div>
              <div className="text-white/70 text-sm font-medium">Rate is for reference only. Updated just now</div>
              {/* Transaction details */}
              <div className="mt-4">
                <button onClick={() => setDetailsOpen((v) => !v)} className="text-white/80 text-base font-medium underline underline-offset-4 hover:text-white transition-colors">
                  {detailsOpen ? "Hide" : "Show"} details
                </button>
                {detailsOpen && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-base text-white/80">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Slippage</span>
                        <select value={slippage} onChange={(e) => setSlippage(parseFloat(e.target.value))} className="bg-[#20232c] border border-white/10 rounded-md px-3 py-2 text-white font-medium">
                          <option value={0.1}>0.1%</option>
                          <option value={0.5}>0.5%</option>
                          <option value={1}>1%</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <div className="font-medium">Expected rate: 1 {fromToken.symbol} ≈ {price.toFixed(4)} {toToken.symbol}</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
                      <div className="font-medium">Tsunami fee: 0.10%</div>
                      <div className="font-medium">Uniswap LP fee: 0.30%</div>
                    </div>
                    <div className="sm:col-span-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 text-white/80">
                      <span className="font-medium">This swap is shielded with zk-proofs. Your wallet generates proofs automatically.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="md:ml-auto">
              <button onClick={onSwap} disabled={isSwapping} className="h-14 px-8 sm:px-10 bg-[#e6ff55] text-[#0a0b0e] font-bold text-base sm:text-lg rounded-full hover:brightness-110 transition-all duration-200 shadow-[0_10px_30px_rgba(230,255,85,0.3)] disabled:opacity-60 disabled:cursor-not-allowed">
                {isSwapping ? "Generating zk proof..." : "Swap Privately"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Token select modal */}
      {selectingSide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectingSide(null)} />
          <div className="relative w-full max-w-md mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-[0_12px_48px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 text-white font-semibold text-lg">
                <Search className="w-5 h-5 text-white/80" />
                Select token
              </div>
              <button className="p-2 hover:bg-white/5 rounded-lg" onClick={() => setSelectingSide(null)}>
                <X className="w-5 h-5 text-white/80" />
              </button>
            </div>
            <input
              value={tokenQuery}
              onChange={(e) => setTokenQuery(e.target.value)}
              placeholder="Search by name or symbol"
              className="w-full mb-4 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/60 outline-none text-base font-medium"
            />
            <div className="max-h-64 overflow-auto divide-y divide-white/10 no-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" as any }}>
              {filteredTokens.map((t) => (
                <button key={t.symbol} onClick={() => selectToken(t)} className="w-full text-left px-4 py-4 hover:bg-white/5 flex items-center justify-between transition-colors">
                  <div>
                    <div className="text-white font-semibold text-base">{t.symbol}</div>
                    <div className="text-white/70 text-sm font-medium">{t.name}</div>
                  </div>
                  {(selectingSide === "from" ? fromToken.symbol === t.symbol : toToken.symbol === t.symbol) && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSuccessOpen(false)} />
          <div className="relative w-full max-w-md mx-auto bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 text-center shadow-[0_12px_48px_rgba(0,0,0,0.6)]">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-300" />
            </div>
            <div className="text-white text-xl font-bold mb-2">Swap Complete!</div>
            <div className="text-white/80 text-base font-medium mb-6">Your private swap has been executed.</div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-left text-white/80 mb-6">
              <div className="font-medium text-base">From: {fromAmount || "0.0"} {fromToken.symbol}</div>
              <div className="font-medium text-base">To: {toAmount || "0.0"} {toToken.symbol}</div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button className="px-5 py-3 rounded-full bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 transition-colors" onClick={() => setSuccessOpen(false)}>Back to Dashboard</button>
              <button className="px-5 py-3 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition-all" onClick={() => setSuccessOpen(false)}>View in Local History</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((t) => (
          <div key={t.id} className="px-4 py-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-white font-medium text-base shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
            {t.message}
          </div>
        ))}
      </div>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
