"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Info,
  ChevronDown,
  Loader2,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

type PublicToken = {
  symbol: string
  name: string
  priceUsd: number
  balance: number
}

const PUBLIC_TOKENS: PublicToken[] = [
  { symbol: "USDC", name: "USD Coin", priceUsd: 1, balance: 2350 },
  { symbol: "DAI", name: "DAI Stablecoin", priceUsd: 1, balance: 1840 },
  { symbol: "ETH", name: "Ethereum", priceUsd: 1600, balance: 1.23 },
]

const FIXED_DENOMS = [100, 500, 1000]

export default function DepositPage() {
  const router = useRouter()

  // UI State
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [tokenQuery, setTokenQuery] = useState("")
  const [selectedToken, setSelectedToken] = useState<PublicToken>(PUBLIC_TOKENS[0])

  const [amount, setAmount] = useState<string>("")
  const [denom, setDenom] = useState<number | "">("")
  const [showVariableFuture, setShowVariableFuture] = useState(false)

  const [generatingNote, setGeneratingNote] = useState(false)
  const [noteReady, setNoteReady] = useState(false)

  const [confirming, setConfirming] = useState<false | "approve" | "lock">(false)
  const [successOpen, setSuccessOpen] = useState(false)

  const [recent, setRecent] = useState<{ label: string; status: "confirmed" | "pending" }[]>([
    { label: "500 USDC → 500 eUSDC", status: "confirmed" },
    { label: "1000 USDC → 1000 eUSDC", status: "pending" },
  ])

  // Derived values (UI only)
  const numericAmount = useMemo(() => Number.parseFloat(amount.replace(/,/g, "")) || 0, [amount])
  const amountUsd = useMemo(() => numericAmount * selectedToken.priceUsd, [numericAmount, selectedToken])
  const insufficient = numericAmount > selectedToken.balance
  const canConfirm = numericAmount > 0 && !insufficient && !!denom && noteReady

  const filteredTokens = useMemo(() => {
    const q = tokenQuery.trim().toLowerCase()
    if (!q) return PUBLIC_TOKENS
    return PUBLIC_TOKENS.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
  }, [tokenQuery])

  function onSelectToken(t: PublicToken) {
    setSelectedToken(t)
    setShowTokenModal(false)
  }

  function setPct(p: number) {
    const next = Math.max(0, Math.min(selectedToken.balance, +(selectedToken.balance * p).toFixed(6)))
    setAmount(next.toString())
  }

  function setMax() {
    setAmount(String(selectedToken.balance))
  }

  function startNoteGeneration() {
    setNoteReady(false)
    setGeneratingNote(true)
    setTimeout(() => {
      setGeneratingNote(false)
      setNoteReady(true)
    }, 1100)
  }

  function onConfirmDeposit() {
    // 2-step UI-only flow
    setConfirming("approve")
    setTimeout(() => setConfirming("lock"), 1200)
    setTimeout(() => {
      setConfirming(false)
      setSuccessOpen(true)
      // update local recent log
      setRecent((prev) => [
        {
          label: `${numericAmount} ${selectedToken.symbol} → ${numericAmount} e${selectedToken.symbol}`,
          status: "confirmed",
        },
        ...prev.slice(0, 4),
      ])
    }, 2400)
  }

  const stealthAddress = "0xStealth...abcd"
  const receiveLabel = denom
    ? `Deposit ${denom} ${selectedToken.symbol} → Receive ${denom} e${selectedToken.symbol}`
    : `Deposit ${selectedToken.symbol} → Receive e${selectedToken.symbol}`

  return (
    <TooltipProvider>
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center">
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
        {/* Dark overlay */}
        <div className="pointer-events-none absolute inset-0 bg-black/10" />

        {/* Page container */}
        <div className="w-full max-w-6xl mx-auto px-4 pb-10 relative z-10 pt-8">
          {/* Glass wrapper */}
          <div className="relative rounded-[32px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-0 opacity-45 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_40%,rgba(255,255,255,0.03)_100%)]" />
            <div
              className="absolute -inset-1 rounded-[36px] pointer-events-none"
              style={{
                background: "radial-gradient(80% 50% at 10% 0%, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%)",
              }}
            />
            <div
              className="relative backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-[32px] p-5 sm:p-6 lg:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.55)]"
              style={{ background: "rgba(255,255,255,0.015)" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-white text-xl font-bold tracking-wide flex items-center gap-2">
                    <button className="text-white text-xl font-bold tracking-wide">Deposit</button>
                    <span className="inline-flex items-center gap-1 text-white text-xs px-2.5 py-1.5 rounded-md bg-white/10 border border-white/15">
                      <Shield className="w-3.5 h-3.5" /> public → private
                    </span>
                  </div>
                  <div className="text-white text-base font-medium mt-2">
                    Convert your ERC-20s into private eERC tokens.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push("/dash")}
                    className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/15 inline-flex items-center gap-2 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                  </button>
                  {/* Tooltip */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-2 rounded-lg border border-white/10 bg-white/10 text-white">
                        <Info className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="w-80 text-white border-white/15" side="bottom" align="end">
                      Your tokens are locked in the ShieldedVault, and you receive private eERC equivalents that only
                      you can spend.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Grid content */}
              <div className="grid lg:grid-cols-3 gap-6 mt-6">
                {/* Left: Token & Amount + Key Generation + Privacy Settings */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Token & Amount */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-white text-base font-semibold">Token & Amount</label>
                      <div className="text-xs text-white">
                        1 {selectedToken.symbol} ≈ ${selectedToken.priceUsd.toLocaleString()}
                      </div>
                    </div>

                    <div className="mt-4 grid sm:grid-cols-[1fr_auto] gap-4 items-stretch">
                      {/* Token selector */}
                      <button
                        onClick={() => setShowTokenModal(true)}
                        className="w-full text-left backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-white/10 transition-colors shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-7 h-7 bg-[#e6ff55] rounded-full flex items-center justify-center">
                            <span className="text-black text-sm font-bold">{selectedToken.symbol[0]}</span>
                          </div>
                          <div>
                            <div className="text-white text-lg font-semibold">{selectedToken.symbol}</div>
                            <div className="text-white text-xs">{selectedToken.name}</div>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-white" />
                      </button>

                      {/* Amount input */}
                      <div
                        className="rounded-2xl backdrop-blur-xl border border-white/15 px-5 py-4 flex flex-col justify-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium">Amount</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => setPct(0.25)}
                              variant="outline"
                              className="h-7 px-2 text-[11px] border-white/15 bg-white/10 hover:bg-white/15 text-white"
                            >
                              25%
                            </Button>
                            <Button
                              onClick={() => setPct(0.5)}
                              variant="outline"
                              className="h-7 px-2 text-[11px] border-white/15 bg-white/10 hover:bg-white/15 text-white"
                            >
                              50%
                            </Button>
                            <Button
                              onClick={setMax}
                              variant="outline"
                              className="h-7 px-2 text-[11px] border-white/15 bg-white/10 hover:bg-white/15 text-white"
                            >
                              Max
                            </Button>
                          </div>
                        </div>
                        <Input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                          placeholder="0.00"
                          className="w-full bg-transparent outline-none text-right text-[28px] leading-[1.1] font-bold text-white tracking-tight mt-1"
                          inputMode="decimal"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-white">
                        Wallet balance: {selectedToken.balance.toLocaleString()} {selectedToken.symbol}
                      </div>
                      <div className="text-sm text-white">
                        ≈ ${amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {insufficient && (
                      <div className="mt-3 flex items-center gap-2 text-rose-200 bg-rose-500/15 border border-rose-500/40 px-3 py-2 rounded-lg text-sm">
                        <AlertTriangle className="w-4 h-4" /> Insufficient balance
                      </div>
                    )}
                  </section>

                  {/* Deposit Commitment Setup */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white text-base font-semibold">Deposit Commitment</div>
                      {noteReady ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-yellow-200 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500/15 border border-yellow-500/40">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-white">Generating your private deposit key…</div>

                    <div className="mt-3">
                      <Progress value={noteReady ? 100 : generatingNote ? 40 : 10} className="h-2 bg-white/10" />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-white">zk commitment (note), stealth address (auto-rotate)</div>
                      <Button
                        onClick={startNoteGeneration}
                        disabled={generatingNote}
                        className="px-3 py-2 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15 text-xs inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        {generatingNote ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Working…
                          </>
                        ) : noteReady ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Save deposit note
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4" /> Generate
                          </>
                        )}
                      </Button>
                    </div>
                  </section>

                  {/* Privacy Settings */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="text-white text-base font-semibold mb-2">Privacy Settings</div>
                    <div className="text-sm text-white">
                      Currently only fixed deposit sizes (100, 500, 1,000 {selectedToken.symbol}).
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {FIXED_DENOMS.map((d) => (
                        <button
                          key={d}
                          onClick={() => setDenom(d)}
                          className={`px-4 py-3 rounded-xl border transition ${
                            denom === d
                              ? "bg-white/15 border-white/25 text-white"
                              : "bg-white/10 border-white/15 text-white hover:bg-white/15"
                          }`}
                        >
                          {d.toLocaleString()} {selectedToken.symbol}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4">
                      <button
                        onClick={() => setShowVariableFuture((s) => !s)}
                        className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white border border-white/15"
                      >
                        Future: variable deposits (preview)
                      </button>
                      {showVariableFuture && (
                        <div className="mt-2 text-xs text-white">
                          Variable deposits will be enabled in a future update.
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right: Transaction Summary + CTA */}
                <div className="space-y-6">
                  {/* Summary */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="text-white text-base font-semibold mb-3">Transaction Summary</div>

                    <div className="space-y-2 text-sm text-white">
                      <div className="flex items-center justify-between">
                        <span>Action</span>
                        <span className="font-medium">{receiveLabel}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Recipient</span>
                        <span className="font-mono text-white">ShieldedVault</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Stealth address</span>
                        <span className="font-mono text-white">{stealthAddress}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Network fees</span>
                        <span className="text-white">~ $1.23</span>
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-white">
                      Step 1: Approve ERC-20 • Step 2: Lock in ShieldedVault • Step 3: Mint eERC note
                    </div>
                  </section>

                  {/* CTA */}
                  <section
                    className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <Button
                      onClick={onConfirmDeposit}
                      disabled={!canConfirm || !!confirming}
                      className="w-full flex items-center justify-center gap-2 h-12 px-8 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold text-sm shadow-[0_10px_30px_rgba(230,255,85,0.3)] hover:brightness-110 transition disabled:opacity-60"
                    >
                      {confirming ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {confirming === "approve" ? "Approving…" : "Locking…"}
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" /> Confirm Deposit
                        </>
                      )}
                    </Button>

                    {!noteReady && (
                      <div className="mt-3 text-xs text-white">
                        Tip: Click "Generate" above to create your private deposit note (for recovery).
                      </div>
                    )}
                  </section>

                  {/* Success state */}
                  {successOpen && (
                    <section
                      className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#e6ff55] text-[#0a0b0e] flex items-center justify-center">
                          🎉
                        </div>
                        <div>
                          <div className="text-white font-semibold">
                            Deposit complete. You now have {numericAmount} e{selectedToken.symbol} in your private
                            balance.
                          </div>
                          <div className="text-white text-sm mt-1">
                            Your {selectedToken.symbol} is now shielded. Only you can prove ownership.
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              onClick={() => router.push("/dash")}
                              className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/15 inline-flex items-center gap-2 text-sm"
                            >
                              <ArrowRight className="w-4 h-4" /> Go to Dashboard
                            </Button>
                            <Button
                              onClick={() => setSuccessOpen(false)}
                              variant="outline"
                              className="px-3 py-2 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15 text-sm"
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </div>

              {/* Recent Deposits */}
              <section
                className="mt-6 rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-white text-base font-semibold">Recent Deposits</div>
                  <div className="text-xs text-white">Local log (private)</div>
                </div>
                <div className="mt-3 space-y-2">
                  {recent.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm py-2 border-b border-white/10 last:border-b-0"
                    >
                      <div className="text-white">{r.label}</div>
                      <div className={r.status === "confirmed" ? "text-emerald-300" : "text-yellow-200"}>
                        {r.status === "confirmed" ? "✅ Confirmed" : "⏳ Pending finality"}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-lg bg-white/10 border border-white/15 text-xs text-white flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5" /> Stored locally only.
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Token selection modal using Dialog */}
        <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
          <DialogContent className="border-white/15">
            <DialogHeader>
              <DialogTitle className="text-white">Select Token</DialogTitle>
              <DialogDescription className="text-white">
                Choose an ERC-20 to convert into a private eERC.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={tokenQuery}
                onChange={(e) => setTokenQuery(e.target.value)}
                placeholder="Search token…"
                className="bg-white/10 border-white/15 text-white placeholder:text-white/60"
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredTokens.map((t) => (
                  <Button
                    key={t.symbol}
                    variant="ghost"
                    onClick={() => onSelectToken(t)}
                    className="w-full justify-between px-3 py-2 hover:bg-white/10 border border-transparent hover:border-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-[#e6ff55] rounded-full flex items-center justify-center">
                        <span className="text-black text-sm font-bold">{t.symbol[0]}</span>
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">{t.symbol}</div>
                        <div className="text-xs text-white">{t.name}</div>
                      </div>
                    </div>
                    <div className="text-xs text-white">Bal: {t.balance.toLocaleString()}</div>
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
