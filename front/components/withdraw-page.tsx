"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { usePublicClient, useWalletClient } from "wagmi"
import { EERC_ADDRESSES } from "@/lib/eerc-config"
import {
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Copy,
  Upload,
  Shield,
  FileCheck,
  Loader2,
  ArrowRight,
  Wallet,
  ArrowLeft,
} from "lucide-react"

type Token = {
  symbol: string
  name: string
  balance: number
  priceUsd: number
}

export default function WithdrawPage() {
  const router = useRouter()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  
  // Mock tokens, balances, and prices (frontend only)
  const tokens = useMemo<Token[]>(
    () => [
      { symbol: "eUSDC", name: "Encrypted USD Coin", balance: 1250, priceUsd: 1 },
      { symbol: "eDAI", name: "Encrypted DAI", balance: 640, priceUsd: 1 },
      { symbol: "eETH", name: "Encrypted ETH", balance: 0.75, priceUsd: 1600 },
    ],
    [],
  )

  // UI State
  const [selectedToken, setSelectedToken] = useState<Token>(tokens[0])
  const [amount, setAmount] = useState<string>("")
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [tokenQuery, setTokenQuery] = useState("")

  const [recipientMode, setRecipientMode] = useState<"default" | "custom">("default")
  const [defaultRecipient, setDefaultRecipient] = useState<string>("0xBEEF...c0ffee")
  const [customRecipient, setCustomRecipient] = useState<string>("")
  const [showAddressBook, setShowAddressBook] = useState(false)

  // Compliance / Proof (frontend placeholders)
  const THRESHOLD_USD = 5000
  const [hasComplianceAttestation, setHasComplianceAttestation] = useState<boolean>(true) // global-ready badge
  const [generatingProof, setGeneratingProof] = useState(false)
  const [proofReady, setProofReady] = useState(false)
  const [proofString, setProofString] = useState<string>("")
  const [proofCopied, setProofCopied] = useState(false)

  // Confirmation & Success
  const [confirming, setConfirming] = useState<false | "verify" | "execute">(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)

  // Derived values
  const numericAmount = useMemo(() => Number.parseFloat(amount.replace(/,/g, "")) || 0, [amount])
  const amountUsd = useMemo(() => numericAmount * selectedToken.priceUsd, [numericAmount, selectedToken])
  const insufficient = numericAmount > selectedToken.balance
  const isPositive = numericAmount > 0
  const recipient = recipientMode === "default" ? defaultRecipient : customRecipient || "0x..."

  const complianceRequired = amountUsd >= THRESHOLD_USD

  const filteredTokens = useMemo(() => {
    const q = tokenQuery.trim().toLowerCase()
    if (!q) return tokens
    return tokens.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
  }, [tokenQuery, tokens])

  const canConfirm =
    isPositive && !insufficient && !!recipient && recipient.startsWith("0x") && (!complianceRequired || proofReady)

  function onSelectToken(t: Token) {
    setSelectedToken(t)
    setShowTokenModal(false)
  }

  function setMax() {
    setAmount(String(selectedToken.balance))
  }

  function startProofGeneration() {
    setGeneratingProof(true)
    setProofReady(false)
    setProofCopied(false)
    setProofString("")
    setTimeout(() => {
      // mock proof building
      setProofString(`zk-proof-${Date.now().toString(36)}`)
      setGeneratingProof(false)
      setProofReady(true)
    }, 1400)
  }

  function copyProof() {
    navigator.clipboard.writeText(proofString || "zk-proof-placeholder")
    setProofCopied(true)
    setTimeout(() => setProofCopied(false), 1500)
  }

  async function onConfirmWithdraw() {
    if (!walletClient || !publicClient) return
    
    try {
      setWithdrawing(true)
      const account = walletClient.account?.address as `0x${string}`
      
      // Sign message for key derivation
      const message = `eERC\nWithdrawing ${amount} ${selectedToken.symbol}\nAddress:${account.toLowerCase()}`
      const signature = await walletClient.signMessage({ account, message })
      
      // Get withdraw calldata from server
      const res = await fetch('/api/eerc/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: account,
          signature,
          tokenId: 1, // For eUSDC
          amount: (parseFloat(amount) * 1e18).toString(), // Convert to wei
          recipient: account, // Withdraw to same address
        })
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Withdraw failed')
      }
      
      const { calldata } = await res.json()
      
      // Send transaction to EERC contract
      const hash = await walletClient.sendTransaction({ 
        account, 
        to: EERC_ADDRESSES.encryptedERC as `0x${string}`, 
        data: calldata as `0x${string}` 
      })
      
      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash })
      
      setSuccessOpen(true)
    } catch (e: any) {
      console.error('Withdraw error:', e)
      alert(`Withdraw failed: ${e.message}`)
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center">
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
      {/* Dark overlay */}
      <div className="pointer-events-none absolute inset-0 bg-black/10" />

      {/* Page container */}
      <div className="w-full max-w-6xl mx-auto px-4 pb-10 relative z-10 pt-8">
        {/* Glass wrapper */}
        <div className="relative rounded-[32px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-0 opacity-45 pointer-events-none" style={{ background: "transparent" }} />
          <div
            className="absolute -inset-1 rounded-[36px] pointer-events-none"
            style={{
              background: "radial-gradient(80% 50% at 10% 0%, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%)",
            }}
          />
          <div
            className="relative backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-[32px] p-5 sm:p-6 lg:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.55)]"
            style={{ background: "transparent" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-xl font-light tracking-tight flex items-center gap-2">
                  <button className="text-xl font-light tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">Withdraw</button>
                  <span className="inline-flex items-center gap-1 text-white text-xs px-2.5 py-1.5 rounded-md bg-white/10 border border-white/15">
                    <Shield className="w-3.5 h-3.5 [stroke:url(#metallic-gradient)]" /> private → public
                  </span>
                </div>
                <div className="text-white text-base font-medium mt-2">
                  Move your private eERC tokens back into the open world of ERC-20s.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/dash")}
                  className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/15 inline-flex items-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Dashboard
                </button>
                <div className="relative group">
                  <div className="p-2 rounded-lg border border-white/10 bg-white/10 text-white">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="absolute right-0 mt-2 hidden group-hover:block z-20">
                    <div
                      className="w-72 text-sm text-white backdrop-blur-xl border border-white/15 rounded-xl p-4"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      Withdrawals above a threshold may require a zk-compliance attestation. Your wallet can help you
                      prove compliance privately.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid content */}
            <div className="grid lg:grid-cols-3 gap-6 mt-6">
              {/* Left column: Token & Amount + Recipient */}
              <div className="lg:col-span-2 space-y-6">
                {/* Token & Amount */}
                <section
                  className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                  style={{ background: "transparent" }}
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
                        <div className="w-7 h-7 bg-emerald-400 rounded-full flex items-center justify-center">
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
                        <button
                          onClick={setMax}
                          className="text-xs px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white border border-white/15"
                        >
                          Max
                        </button>
                      </div>
                      <input
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
                      You have {selectedToken.balance} {selectedToken.symbol} available
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

                {/* Recipient */}
                <section
                  className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-white text-base font-semibold">Recipient</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddressBook(true)}
                        className="px-3 py-1.5 text-xs rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/15"
                      >
                        Address Book
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <button
                      onClick={() => setRecipientMode("default")}
                      className={`px-3 py-1.5 text-xs rounded-md border ${
                        recipientMode === "default"
                          ? "bg-white/15 border-white/25 text-white"
                          : "bg-white/10 border-white/15 text-white hover:bg-white/15"
                      }`}
                    >
                      Linked wallet
                    </button>
                    <button
                      onClick={() => setRecipientMode("custom")}
                      className={`px-3 py-1.5 text-xs rounded-md border ${
                        recipientMode === "custom"
                          ? "bg-white/15 border-white/25 text-white"
                          : "bg-white/10 border-white/15 text-white hover:bg-white/15"
                      }`}
                    >
                      Custom address
                    </button>
                  </div>

                  {recipientMode === "default" ? (
                    <div className="grid gap-2">
                      <div className="text-xs text-white">Your main public address</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white font-mono text-sm flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-white" />
                          {defaultRecipient}
                        </div>
                        <button
                          onClick={() => setDefaultRecipient("0x" + Math.random().toString(16).slice(2, 6) + "...abcd")}
                          className="px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white hover:bg-white/15 text-xs"
                        >
                          Rotate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <div className="text-xs text-white">Paste destination</div>
                      <input
                        value={customRecipient}
                        onChange={(e) => setCustomRecipient(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/60 outline-none text-sm"
                      />
                    </div>
                  )}
                </section>
              </div>

              {/* Right column: Compliance + Proof + Summary + CTA */}
              <div className="space-y-6">
                {/* Compliance Check Module */}
                <section
                  className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-white text-base font-semibold">Compliance Check</div>
                    {hasComplianceAttestation ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-yellow-200 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500/15 border border-yellow-500/40">
                        <AlertTriangle className="w-3.5 h-3.5" /> Action needed
                      </span>
                    )}
                  </div>

                  {Number.isFinite(amountUsd) && isPositive ? (
                    complianceRequired ? (
                      <div className="flex items-start gap-3 bg-yellow-500/15 border border-yellow-500/40 text-yellow-100 px-4 py-3 rounded-xl">
                        <AlertTriangle className="w-5 h-5 mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">zk-Attestation required</div>
                          <div className="text-xs opacity-90">
                            This withdrawal is above ${THRESHOLD_USD.toLocaleString()}. Provide a zk-compliance proof to
                            proceed.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 px-4 py-3 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-sm font-semibold">No attestation required</div>
                          <div className="text-xs opacity-90">
                            This amount is below ${THRESHOLD_USD.toLocaleString()}.
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-white">Enter an amount to check compliance requirements.</div>
                  )}

                  {/* Upload/Prove buttons (placeholders) */}
                  {complianceRequired && (
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => setHasComplianceAttestation(true)}
                        className="px-3 py-2 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15 text-xs inline-flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" /> Upload Attestation
                      </button>
                      <button
                        onClick={startProofGeneration}
                        className="px-3 py-2 rounded-full bg-[#e6ff55] text-[#0a0b0e] text-xs font-bold hover:brightness-110 transition inline-flex items-center gap-2 disabled:opacity-60"
                        disabled={generatingProof}
                      >
                        {generatingProof ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Building zk-proof…
                          </>
                        ) : proofReady ? (
                          <>
                            <FileCheck className="w-4 h-4" /> Proof ready
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4" /> Prove Compliance
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </section>

                {/* Proof Generation Section */}
                <section
                  className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white text-base font-semibold">Proof Generation</div>
                    {proofReady ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    ) : generatingProof ? (
                      <span className="inline-flex items-center gap-1.5 text-white text-xs px-2.5 py-1.5 rounded-md bg-white/10 border border-white/15">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Building…
                      </span>
                    ) : (
                      <span className="text-xs text-white">No proof generated</span>
                    )}
                  </div>
                  <div className="text-xs text-white">
                    Behind the scenes: wallet generates spend proof + compliance proof.
                  </div>

                  <div className="mt-4 grid gap-2">
                    <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono min-h-[44px] flex items-center justify-between">
                      <span className="truncate">
                        {proofReady ? proofString : generatingProof ? "Building zk-proof…" : "—"}
                      </span>
                      <button
                        onClick={copyProof}
                        disabled={!proofReady}
                        className="ml-3 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs border border-white/15 disabled:opacity-60"
                      >
                        <Copy className="w-3.5 h-3.5" /> {proofCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Transaction Summary */}
                <section
                  className="rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div className="text-white text-base font-semibold mb-3">Summary</div>
                  <div className="space-y-2 text-sm text-white">
                    <div className="flex items-center justify-between">
                      <span>Withdrawing</span>
                      <span className="font-medium">
                        {amount || "0.00"} {selectedToken.symbol} → {amount || "0.00"}{" "}
                        {selectedToken.symbol.replace(/^e/, "")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Recipient</span>
                      <span className="font-mono">{recipient}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Compliance</span>
                      <span
                        className={`${complianceRequired ? (proofReady ? "text-emerald-300" : "text-yellow-200") : "text-emerald-300"}`}
                      >
                        {complianceRequired ? (proofReady ? "Proof ready" : "Required") : "Not required"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Network fees</span>
                      <span>~$2.10 (est.)</span>
                    </div>
                  </div>

                  <div className="mt-5">
                    <button
                      onClick={onConfirmWithdraw}
                      disabled={!canConfirm || withdrawing}
                      className="w-full h-14 px-8 bg-[#e6ff55] text-[#0a0b0e] font-bold text-base rounded-full hover:brightness-110 transition-all duration-200 shadow-[0_10px_30px_rgba(230,255,85,0.3)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {withdrawing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Withdrawing...
                        </>
                      ) : (
                        <>
                          Confirm Withdrawal <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Token select modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTokenModal(false)} />
          <div
            className="relative w-full max-w-md mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-6 shadow-[0_12px_48px_rgba(0,0,0,0.6)] bg-black/60 text-white"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 text-white font-semibold text-lg">
                <Search className="w-5 h-5 text-white" />
                Select token
              </div>
              <button
                className="p-2 hover:bg-white/10 rounded-lg border border-white/10"
                onClick={() => setShowTokenModal(false)}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <input
              value={tokenQuery}
              onChange={(e) => setTokenQuery(e.target.value)}
              placeholder="Search by name or symbol"
              className="w-full mb-4 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/60 outline-none text-base font-medium"
            />
            <div
              className="max-h-64 overflow-auto divide-y divide-white/10 no-scrollbar"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" as any }}
            >
              {filteredTokens.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => onSelectToken(t)}
                  className="w-full text-left px-4 py-4 hover:bg-white/5 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-white font-semibold text-base">{t.symbol}</div>
                    <div className="text-white text-sm font-medium">{t.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white">Balance</div>
                    <div className="text-white text-sm">{t.balance}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Address Book modal (stub) */}
      {showAddressBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddressBook(false)} />
          <div
            className="relative w-full max-w-md mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-6 shadow-[0_12px_48px_rgba(0,0,0,0.6)]"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 text-white font-semibold text-lg">
                <Wallet className="w-5 h-5 text-white" />
                Address Book
              </div>
              <button
                className="p-2 hover:bg-white/10 rounded-lg border border-white/10"
                onClick={() => setShowAddressBook(false)}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { label: "Main", addr: "0xA11cE...b00b" },
                { label: "Trading", addr: "0xDeaD...Beef" },
                { label: "CEX Deposit", addr: "0xC0ffEE...Cafe" },
              ].map((e) => (
                <button
                  key={e.label}
                  onClick={() => {
                    setRecipientMode("custom")
                    setCustomRecipient(e.addr.replace("...", ""))
                    setShowAddressBook(false)
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition"
                >
                  <div className="text-left">
                    <div className="text-sm font-semibold">{e.label}</div>
                    <div className="text-xs text-white">{e.addr}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success modal */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSuccessOpen(false)} />
          <div
            className="relative w-full max-w-md mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-8 text-center shadow-[0_12px_48px_rgba(0,0,0,0.6)] bg-black/60 text-white"
          >
            {/* subtle confetti-ish accent */}
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-300" />
            </div>
            <div className="text-white text-xl font-bold mb-2">Withdrawal Complete!</div>
            <div className="text-white text-base font-medium mb-6">
              Your assets have been moved to the public chain.
            </div>
            <div
              className="backdrop-blur-xl border border-white/15 rounded-xl p-5 text-left text-white mb-6"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div className="font-medium text-base">
                Amount: {amount || "0.00"} {selectedToken.symbol} → {amount || "0.00"}{" "}
                {selectedToken.symbol.replace(/^e/, "")}
              </div>
              <div className="font-medium text-base">Recipient: {recipient}</div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                className="px-5 py-3 rounded-full bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                onClick={() => router.push("/dash")}
              >
                Back to Dashboard
              </button>
              <button
                className="px-5 py-3 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition-all"
                onClick={() => setSuccessOpen(false)}
              >
                View Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
