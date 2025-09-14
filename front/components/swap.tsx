"use client"

import { useEffect, useMemo, useState } from "react"
import { useAccount } from "wagmi"
import { useEERC } from "@/hooks/useEERC"
import { useEncryptedBalance } from "@/hooks/useEncryptedBalance"
import { useV3Swap, FUJI_TOKENS, POOL_FEES } from "@/hooks/useV3Swap"
import {
  ArrowUpDown,
  ChevronDown,
  TrendingUp,
  RotateCcw,
  Settings,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import LiquidEther from "./liquid-ether"

export default function TsunamiSwap() {
  const { address, isConnected } = useAccount()
  const { isInitialized, isRegistered } = useEERC()
  const { balanceInTokens, privateTransfer, refetchBalance } = useEncryptedBalance()

  const tokenList = useMemo(
    () => [
      {
        symbol: "eUSDC",
        name: "Encrypted USD Coin",
        balance: balanceInTokens,
        address: FUJI_TOKENS.USDC.address,
        decimals: FUJI_TOKENS.USDC.decimals
      },
      {
        symbol: "eWAVAX",
        name: "Encrypted Wrapped AVAX",
        balance: 0,
        address: FUJI_TOKENS.WAVAX.address,
        decimals: FUJI_TOKENS.WAVAX.decimals
      },
    ],
    [balanceInTokens],
  )

  const [fromToken, setFromToken] = useState(tokenList[0])
  const [toToken, setToToken] = useState(tokenList[1])
  const [fromAmount, setFromAmount] = useState<string>("")
  const [insufficientBalance, setInsufficientBalance] = useState(false)
  const [selectingSide, setSelectingSide] = useState<"from" | "to" | null>(null)
  const [tokenQuery, setTokenQuery] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [slippage, setSlippage] = useState(0.5)
  const [isSwapping, setIsSwapping] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([])
  const [selectedFee, setSelectedFee] = useState(POOL_FEES.MEDIUM)

  // Initialize V3 swap hook
  const {
    quote: v3Quote,
    minAmountOut,
    priceImpact,
    poolExists,
    isLoading: isV3Loading,
    error: v3Error,
    executePrivateSwap,
    refreshQuote,
    txHash
  } = useV3Swap({
    tokenIn: fromToken?.address,
    tokenOut: toToken?.address,
    amountIn: fromAmount,
    fee: selectedFee,
    slippage
  })

  // Update UI when V3 quote changes
  useEffect(() => {
    if (v3Quote && parseFloat(v3Quote) > 0) {
      const formattedQuote = parseFloat(v3Quote).toLocaleString(undefined, {
        maximumFractionDigits: 6
      })
      // Set the quoted amount (we don't set toAmount directly to avoid conflicts)
    }
  }, [v3Quote])

  // Check for insufficient balance
  useEffect(() => {
    const amt = Number.parseFloat(fromAmount.replace(/,/g, ""))
    if (isFinite(amt) && amt > 0) {
      setInsufficientBalance(amt > fromToken.balance)
    } else {
      setInsufficientBalance(false)
    }
  }, [fromAmount, fromToken])

  const filteredTokens = useMemo(() => {
    const q = tokenQuery.trim().toLowerCase()
    if (!q) return tokenList
    return tokenList.filter((t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
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
    setFromAmount(v3Quote || "0")
  }

  function addToast(message: string) {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }

  async function onSwap() {
    if (!isConnected || !isRegistered) {
      setErrorMessage("Please connect your wallet and register with eERC first")
      return
    }

    if (!poolExists) {
      setErrorMessage("Pool does not exist for this token pair")
      return
    }

    setErrorMessage(null)
    const amt = Number.parseFloat(fromAmount.replace(/,/g, ""))
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
      addToast("Initializing private swap...")

      // Execute the V3 private swap
      addToast("Generating ZK proof for spend...")
      await executePrivateSwap(address!, slippage)

      addToast("Swap executed successfully!")
      addToast("Tokens deposited to encrypted balance")

      // Refresh balance
      await refetchBalance()

      setIsSwapping(false)
      setSuccessOpen(true)

      // Reset form
      setFromAmount("")
    } catch (e) {
      setIsSwapping(false)
      const errorMsg = e instanceof Error ? e.message : "Swap failed"
      setErrorMessage(`Swap failed: ${errorMsg}`)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center">
      <div className="absolute inset-0 z-0">
        <LiquidEther
          colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
          mouseForce={0}
          cursorSize={0}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.6}
          autoIntensity={2.0}
          takeoverDuration={0}
          autoResumeDelay={0}
          autoRampDuration={0.4}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-black/15 z-1" />

      <div className="pt-28 mb-6 relative z-10">
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

      <div className="w-full max-w-6xl mx-auto px-4 pb-10 relative z-10">
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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <button className="text-white text-xl font-bold tracking-wide">Swap</button>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10 backdrop-blur-sm">
                  <RotateCcw className="w-5 h-5 text-white/60" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10 backdrop-blur-sm">
                  <Settings className="w-5 h-5 text-white/60" />
                </button>
              </div>
            </div>
            <div className="text-white/70 text-base font-medium mb-8">
              Private token swaps powered by Tsunami & Uniswap v4
            </div>

            {errorMessage && (
              <div className="mb-6 flex items-center gap-3 bg-rose-500/15 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-base font-medium">{errorMessage}</span>
              </div>
            )}

            <div className="relative">
              <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/10" />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="">
                  <label className="text-white/80 text-base font-semibold mb-3 block">From:</label>
                  <div className="text-sm text-white/70 mb-3 font-medium">
                    Balance: {fromToken.balance.toLocaleString()} {fromToken.symbol}
                  </div>

                  <button
                    onClick={() => openTokenModal("from")}
                    className="w-full text-left backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between mb-5 hover:bg-white/10 transition-colors shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-7 h-7 bg-purple-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{fromToken.symbol[0]}</span>
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

                  <div
                    className="rounded-2xl backdrop-blur-xl border border-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)] p-6"
                    style={{ background: "rgba(255,255,255,0.018)" }}
                  >
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
                      <div className="text-rose-300 text-base font-medium mt-2">
                        {insufficientBalance ? "Insufficient balance" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="">
                  <label className="text-white/80 text-base font-semibold mb-3 block">To:</label>
                  <div className="text-sm text-white/70 mb-3 font-medium">
                    Balance: {toToken.balance.toLocaleString()} {toToken.symbol}
                  </div>

                  <button
                    onClick={() => openTokenModal("to")}
                    className="w-full text-left backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between mb-5 hover:bg-white/10 transition-colors shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-7 h-7 bg-pink-400 rounded-full flex items-center justify-center">
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

                  <div
                    className="rounded-2xl backdrop-blur-xl border border-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)] p-6"
                    style={{ background: "rgba(255,255,255,0.028)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/80 text-base font-semibold">You receive:</span>
                      <span className="text-white/70 text-sm font-medium">Estimated</span>
                    </div>
                    <div className="text-center">
                      <div className="text-[44px] sm:text-[48px] leading-[1.1] font-bold text-white tracking-tight">
                        {v3Quote && parseFloat(v3Quote) > 0
                          ? parseFloat(v3Quote).toLocaleString(undefined, { maximumFractionDigits: 6 })
                          : "0.0"
                        }
                      </div>
                      {poolExists && v3Quote && (
                        <div className="text-sm text-green-400 mt-1 flex items-center justify-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                          Live Uniswap V3 Price
                        </div>
                      )}
                      {!poolExists && (
                        <div className="text-sm text-yellow-400 mt-1 flex items-center justify-center gap-1">
                          <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></div>
                          Pool not found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center">
                <button
                  onClick={flipDirection}
                  className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 w-12 h-12 bg-white/10 backdrop-blur-md border-2 border-white/25 rounded-full flex items-center justify-center hover:-translate-y-[calc(50%+2px)] transition-all duration-200 group shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                >
                  <ArrowUpDown className="w-5 h-5 text-white/65 group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white text-base font-semibold">
                    1 {fromToken.symbol} = {price.toFixed(6)} {toToken.symbol}
                  </span>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300 text-base font-semibold">5.62% (24H)</span>
                </div>
                <div className="text-white/70 text-sm font-medium">Rate is for reference only. Updated just now</div>
                <div className="mt-4">
                  <button
                    onClick={() => setDetailsOpen((v) => !v)}
                    className="text-white/80 text-base font-medium underline underline-offset-4 hover:text-white transition-colors"
                  >
                    {detailsOpen ? "Hide" : "Show"} details
                  </button>
                  {detailsOpen && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-base text-white/80">
                      <div
                        className="backdrop-blur-xl border border-white/15 rounded-xl p-4"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Slippage</span>
                          <select
                            value={slippage}
                            onChange={(e) => setSlippage(Number.parseFloat(e.target.value))}
                            className="bg-[#20232c] border border-white/10 rounded-md px-2 py-1 text-sm text-white font-medium"
                          >
                            <option value={0.1}>0.1%</option>
                            <option value={0.5}>0.5%</option>
                            <option value={1}>1%</option>
                            <option value={2}>2%</option>
                          </select>
                        </div>
                      </div>

                      <div
                        className="backdrop-blur-xl border border-white/15 rounded-xl p-4"
                        style={{ background: "rgba(255,255,255,0.018)" }}
                      >
                        <div className="font-semibold mb-1">Pool Fee</div>
                        <select
                          value={selectedFee}
                          onChange={(e) => setSelectedFee(Number.parseInt(e.target.value))}
                          className="bg-[#20232c] border border-white/10 rounded-md px-2 py-1 text-sm text-white font-medium w-full"
                        >
                          <option value={POOL_FEES.LOW}>0.05% (Low)</option>
                          <option value={POOL_FEES.MEDIUM}>0.3% (Medium)</option>
                          <option value={POOL_FEES.HIGH}>1% (High)</option>
                        </select>
                      </div>

                      <div
                        className="backdrop-blur-xl border border-white/15 rounded-xl p-4"
                        style={{ background: "rgba(255,255,255,0.018)" }}
                      >
                        <div className="font-semibold mb-1">Minimum Received</div>
                        <div className="text-sm">
                          {minAmountOut} {toToken.symbol}
                        </div>
                      </div>

                      {priceImpact > 0 && (
                        <div
                          className={`backdrop-blur-xl border rounded-xl p-4 ${
                            priceImpact > 5 ? 'border-red-500/30 bg-red-500/10' :
                            priceImpact > 1 ? 'border-yellow-500/30 bg-yellow-500/10' :
                            'border-green-500/30 bg-green-500/10'
                          }`}
                        >
                          <div className="font-semibold mb-1">Price Impact</div>
                          <div className={`text-sm font-medium ${
                            priceImpact > 5 ? 'text-red-400' :
                            priceImpact > 1 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {priceImpact.toFixed(2)}%
                          </div>
                        </div>
                      )}

                      <div
                        className="backdrop-blur-xl border border-white/15 rounded-xl p-4"
                        style={{ background: "rgba(255,255,255,0.018)" }}
                      >
                        <div className="font-semibold mb-1">Route</div>
                        <div className="text-xs text-white/60">
                          {fromToken.symbol} → {toToken.symbol}
                        </div>
                        <div className="text-xs text-blue-400 mt-1">
                          Via Uniswap V3
                        </div>
                      </div>

                      <div
                        className="sm:col-span-2 lg:col-span-3 backdrop-blur-xl border border-white/15 rounded-xl p-4 text-white/80"
                        style={{ background: "rgba(255,255,255,0.015)" }}
                      >
                        <span className="font-medium text-sm">
                          🔒 This swap is completely private using zero-knowledge proofs. Your transaction history and balances remain encrypted on-chain.
                        </span>
                        {!poolExists && (
                          <div className="mt-2 text-yellow-400 text-xs">
                            ⚠️ Pool not found for selected fee tier. Try a different fee tier or token pair.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:ml-auto">
                <button
                  onClick={onSwap}
                  disabled={isSwapping || !poolExists || isV3Loading || insufficientBalance}
                  className={`h-14 px-8 sm:px-10 font-bold text-base sm:text-lg rounded-full transition-all duration-200 shadow-[0_10px_30px_rgba(139,92,246,0.3)] disabled:opacity-60 disabled:cursor-not-allowed hover:scale-105 ${
                    !poolExists
                      ? 'bg-gray-500 hover:bg-gray-600'
                      : insufficientBalance
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-purple-500 hover:bg-purple-600'
                  } text-white`}
                >
                  {isSwapping
                    ? "Executing Private Swap..."
                    : isV3Loading
                    ? "Loading V3 Quote..."
                    : !poolExists
                    ? "Pool Not Found"
                    : insufficientBalance
                    ? "Insufficient Balance"
                    : "Swap Privately via V3"
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {selectingSide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSelectingSide(null)} />
            <div
              className="relative w-full max-w-md mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-6 shadow-[0_12px_48px_rgba(0,0,0,0.6)]"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3 text-white font-semibold text-lg">
                  <Search className="w-5 h-5 text-white/80" />
                  Select token
                </div>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg border border-white/10"
                  onClick={() => setSelectingSide(null)}
                >
                  <X className="w-5 h-5 text-white/80" />
                </button>
              </div>
              <input
                value={tokenQuery}
                onChange={(e) => setTokenQuery(e.target.value)}
                placeholder="Search by name or symbol"
                className="w-full mb-4 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/60 outline-none text-base font-medium"
              />
              <div className="max-h-64 overflow-auto divide-y divide-white/10">
                {filteredTokens.map((t) => (
                  <button
                    key={t.symbol}
                    onClick={() => selectToken(t)}
                    className="w-full text-left px-4 py-4 hover:bg-white/5 flex items-center justify-between transition-colors"
                  >
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

        {successOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSuccessOpen(false)} />
            <div
              className="relative w-full max-w-md mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-8 text-center shadow-[0_12px_48px_rgba(0,0,0,0.6)]"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-300" />
              </div>
              <div className="text-white text-xl font-bold mb-2">Swap Complete!</div>
              <div className="text-white/80 text-base font-medium mb-6">Your private swap has been executed.</div>
              <div
                className="backdrop-blur-xl border border-white/15 rounded-xl p-5 text-left text-white/80 mb-6"
                style={{ background: "rgba(255,255,255,0.028)" }}
              >
                <div className="font-medium text-base">
                  From: {fromAmount || "0.0"} {fromToken.symbol}
                </div>
                <div className="font-medium text-base">
                  To: {v3Quote || "0.0"} {toToken.symbol}
                </div>
                {txHash && (
                  <div className="text-sm text-blue-400 mt-2">
                    Transaction: {txHash.slice(0, 6)}...{txHash.slice(-4)}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-4">
                <button
                  className="px-5 py-3 rounded-full bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                  onClick={() => setSuccessOpen(false)}
                >
                  Back to Dashboard
                </button>
                <button
                  className="px-5 py-3 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition-all"
                  onClick={() => setSuccessOpen(false)}
                >
                  View in Local History
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="fixed bottom-4 right-4 z-50 space-y-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="px-4 py-3 rounded-xl backdrop-blur-xl border border-white/15 text-white font-medium text-base shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              {t.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
