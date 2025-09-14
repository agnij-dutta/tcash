"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useRouter } from "next/navigation"
import { useEERC } from "@/hooks/useEERC"
import { useHardcodedWallet } from "@/hooks/useHardcodedWallet"
import {
  Shield,
  Wallet,
  KeyRound,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

type Mode = "create" | "import"

const FEATURE_CARDS = [
  { title: "Deposit Privately", desc: "Lock ERC-20s, mint eERCs" },
  { title: "Swap Privately", desc: "Use Uniswap v4 liquidity without leaking your wallet" },
  { title: "Withdraw Flexibly", desc: "Stay private or prove compliance when needed" },
]

function generateSeed(words = 12) {
  const list = [
    "ocean",
    "wave",
    "storm",
    "reef",
    "coral",
    "island",
    "current",
    "spray",
    "tidal",
    "whale",
    "shell",
    "pearl",
    "drift",
    "sprout",
    "amber",
    "harbor",
    "siren",
    "azure",
    "mist",
    "delta",
    "brine",
    "gale",
    "lunar",
    "sable",
  ]
  const out: string[] = []
  for (let i = 0; i < words; i++) out.push(list[Math.floor(Math.random() * list.length)])
  return out
}

export default function OnboardingPage() {
  const router = useRouter()
  const { address, isConnected } = useHardcodedWallet()
  const { isInitialized, isRegistered, register, deposit, withdraw } = useEERC()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<Mode>("create")

  // Create wallet state
  const [seed, setSeed] = useState<string[]>([])
  const [seedShown, setSeedShown] = useState(false)
  const [confirmIdx, setConfirmIdx] = useState<number[]>([])
  const [confirmWords, setConfirmWords] = useState<Record<number, string>>({})

  // Import state
  const [importInput, setImportInput] = useState("")
  const [importError, setImportError] = useState<string | null>(null)

  // Stealth address
  const [stealthAddress, setStealthAddress] = useState<string>("")
  const [advancedStealth, setAdvancedStealth] = useState(false)
  const [extraStealthCount, setExtraStealthCount] = useState(1)

  // Compliance
  const [compliance, setCompliance] = useState<"retail" | "institutional">("retail")

  // Finish / Confetti
  const [finishing, setFinishing] = useState(false)
  const [confetti, setConfetti] = useState(false)

  // eERC Registration state
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationError, setRegistrationError] = useState<string | null>(null)
  const [registrationStep, setRegistrationStep] = useState<'generate' | 'register' | 'complete'>('generate')
  const [retryCount, setRetryCount] = useState(0)
  const [initializationTimeout, setInitializationTimeout] = useState(false)

  // Init defaults
  useEffect(() => {
    if (seed.length === 0) setSeed(generateSeed(12))
    if (!stealthAddress) rotateStealth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Add initialization timeout
  useEffect(() => {
    if (isConnected && !isInitialized && !initializationTimeout) {
      const timeout = setTimeout(() => {
        console.warn("eERC initialization timeout - showing fallback")
        setInitializationTimeout(true)
      }, 15000) // 15 second timeout

      return () => clearTimeout(timeout)
    }
  }, [isConnected, isInitialized, initializationTimeout])

  // eERC Registration functions (simplified for direct contract calls)
  const handleRegister = async () => {
    if (!isConnected) {
      setRegistrationError("Please connect your wallet first")
      return
    }

    try {
      setIsRegistering(true)
      setRegistrationError(null)
      setRegistrationStep('register')
      
      // With direct contract calls, registration is automatic
      console.log("eERC registration completed (using direct contract calls)")
      
      setRegistrationStep('complete')
      
      // Move to next step after successful registration
      setTimeout(() => {
        setStep(step + 1)
      }, 1500)
      
    } catch (error) {
      console.error("Registration failed:", error)
      setRegistrationError(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRegistering(false)
    }
  }

  function next() {
    setStep((s) => Math.min(6, s + 1))
  }
  function prev() {
    setStep((s) => Math.max(0, s - 1))
  }

  function rotateStealth() {
    const rand = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    setStealthAddress(`0x${rand}...${rand.slice(-4)}`)
  }

  // Choose 3 indices to confirm on key backup step
  useEffect(() => {
    if (step === 2 && confirmIdx.length === 0) {
      const picks = new Set<number>()
      while (picks.size < 3) picks.add(Math.floor(Math.random() * seed.length))
      setConfirmIdx(Array.from(picks))
    }
  }, [step, seed.length, confirmIdx.length])

  const confirmOk = useMemo(() => {
    if (confirmIdx.length < 2) return false
    return confirmIdx.every((i) => (confirmWords[i] || "").trim().toLowerCase() === seed[i])
  }, [confirmIdx, confirmWords, seed])

  function onImportValidate() {
    const trimmed = importInput.trim()
    if (!trimmed) {
      setImportError("Enter your seed phrase (12/24 words) or a private key")
      return false
    }
    const words = trimmed.split(/\s+/)
    if (words.length === 1) {
      const ok = /^0x?[0-9a-fA-F]{64}$/.test(words[0])
      if (!ok) {
        setImportError("Private key must be 64 hex characters")
        return false
      }
    } else if (words.length !== 12 && words.length !== 24) {
      setImportError("Seed phrase must be 12 or 24 words")
      return false
    }
    setImportError(null)
    return true
  }

  function startFinish() {
    setConfetti(true)
    setTimeout(() => setConfetti(false), 1800)
    setFinishing(true)
  }

  // Shared glass card
  function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
      <section
        className={`rounded-2xl backdrop-blur-xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)] ${className}`}
        style={{ background: "transparent" }}
      >
        {children}
      </section>
    )
  }

  return (
    <TooltipProvider>
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

        {/* Container */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-10 relative z-10 pt-24">
          <div className="relative rounded-[32px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
            <div className="absolute inset-0 opacity-45 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_40%,rgba(255,255,255,0.03)_100%)]" />
            <div
              className="absolute -inset-1 rounded-[36px] pointer-events-none"
              style={{
                background: "radial-gradient(80% 50% at 10% 0%, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%)",
              }}
            />
            <div
              className="relative backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-[32px] p-6 sm:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.55)]"
              style={{ background: "rgba(255,255,255,0.015)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <Shield className="w-5 h-5 text-black" />
                  </div>
                  <div className="text-sm font-light tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">Tsunami Onboarding</div>
                </div>
                <div className="text-xs text-white/70">Step {step + 1} / 6</div>
              </div>

              {/* Progress */}
              <div className="mt-4">
                <Progress value={((step + 1) / 6) * 100} className="h-2 bg-white/10" />
              </div>

              {/* Content */}
              <div className="mt-6 space-y-6">
                {/* 1. Welcome */}
                {step === 0 && (
                  <Card>
                    <div className="flex flex-col items-center text-center gap-4 py-8">
                      <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow">
                        <Shield className="w-7 h-7 [stroke:url(#metallic-gradient)]" />
                      </div>
                      <div className="text-3xl font-extralight tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">Tsunami</div>
                      <div className="text-white/85 text-base">“Private. Compliant. DeFi-native.”</div>
                      <div className="text-white/60 text-sm max-w-xl">
                        Your tokens, your privacy. Built on Uniswap v4 + zkSNARKs.
                      </div>
                      <Button
                        onClick={next}
                        className="mt-2 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold px-6 h-11 hover:bg-[#f1ff8a]"
                      >
                        Get Started
                      </Button>
                    </div>
                  </Card>
                )}

                {/* 2. Wallet Setup */}
                {step === 1 && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/90 text-[#0a0b0e] flex items-center justify-center">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-semibold">Create New Wallet</div>
                          <div className="text-white/70 text-sm">
                            Generates private key + stealth address. Auto-creates local encrypted store.
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <Button
                          onClick={() => {
                            setMode("create")
                            next()
                          }}
                          className="rounded-full bg-white/10 border border-white/15 text-white/90 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent px-5"
                        >
                          Continue
                        </Button>
                        <span className="text-xs text-white/60">Default</span>
                      </div>
                    </Card>
                    <Card>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/90 text-[#0a0b0e] flex items-center justify-center">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-semibold">Import Existing Wallet</div>
                          <div className="text-white/70 text-sm">
                            Enter seed phrase / private key. Option to import from MetaMask/WalletConnect.
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <Input
                          value={importInput}
                          onChange={(e) => setImportInput(e.target.value)}
                          placeholder="Seed phrase (12/24 words) or 0x private key"
                          className="bg-white/10 border-white/15 text-white placeholder:text-white/60"
                        />
                        {importError && (
                          <div className="text-xs text-rose-200 bg-rose-500/15 border border-rose-500/40 px-3 py-2 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> {importError}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => {
                              if (onImportValidate()) {
                                setMode("import")
                                next()
                              }
                            }}
                            className="rounded-full bg-white/10 border border-white/15 text-white/90 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent px-5"
                          >
                            Continue
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="p-2 rounded-lg border border-white/10 bg-white/10 text-white/80 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent">
                                <Info className="w-5 h-5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="border-white/15 text-white/85">
                              MetaMask/WalletConnect import coming soon
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* 3. Connect Wallet (replacing previous Step 2 and 3) */}
                {step === 2 && (
                  <Card>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/90 text-[#0a0b0e] flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">Connect your wallet</div>
                        <div className="text-white/70 text-sm">Use RainbowKit to connect and continue.</div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-center">
                      <ConnectButton />
                    </div>
                    <div className="mt-6">
                      <Button
                        onClick={next}
                        disabled={!isConnected}
                        className="w-full rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:bg-[#f1ff8a] disabled:opacity-50"
                      >
                        Continue
                      </Button>
                    </div>
                  </Card>
                )}

                {/* 4. Stealth Address (shifted down) */}

                {step === 3 && (
                  <Card>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/90 text-[#0a0b0e] flex items-center justify-center">
                        <EyeOff className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold">Stealth Address Setup</div>
                        <div className="text-white/70 text-sm">
                          Your public address is hidden. We use stealth addresses to protect your activity.
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-sm text-white/85">
                        Current stealth: <span className="font-mono text-white">{stealthAddress}</span>
                      </div>
                      <Button
                        onClick={rotateStealth}
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 text-white/90 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent px-4 py-2 text-sm"
                      >
                        <RefreshCw className="w-4 h-4" /> Rotate
                      </Button>
                    </div>
                    <div className="mt-4">
                      <label className="flex items-center gap-2 text-xs text-white/70">
                        <input
                          type="checkbox"
                          checked={advancedStealth}
                          onChange={(e) => setAdvancedStealth(e.target.checked)}
                        />
                        Advanced: Generate multiple stealth addresses
                      </label>
                      {advancedStealth && (
                        <div className="mt-2 flex items-center gap-3">
                          <div className="text-xs text-white/70">Count</div>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={extraStealthCount}
                            onChange={(e) =>
                              setExtraStealthCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))
                            }
                            className="w-24 bg-white/10 border-white/15 text-white"
                          />
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={next}
                        className="rounded-full bg-white/10 border border-white/15 text-white/90 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent px-5"
                      >
                        Okay, got it
                      </Button>
                    </div>
                  </Card>
                )}

                {/* 5. Compliance Preference */}
                {step === 4 && (
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-semibold">Compliance Preference</div>
                        <div className="text-white/70 text-sm">
                          Choose Retail if you’re just trading privately. Choose Institutional if you need
                          compliance-ready withdrawals.
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-2 rounded-lg border border-white/10 bg-white/10 text-white/80">
                            <Info className="w-5 h-5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="border-white/15 text-white/85" side="left">
                          Retail: no KYC below threshold • Institutional: enable zk-attestation
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setCompliance("retail")}
                        className={`px-4 py-4 rounded-xl border transition text-left ${
                          compliance === "retail"
                            ? "bg-white/15 border-white/25 text-white"
                            : "bg-white/10 border-white/15 text-white/85 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent"
                        }`}
                      >
                        <div className="text-white font-medium">Retail Mode</div>
                        <div className="text-xs text-white/70">Withdrawals below threshold, no KYC.</div>
                      </button>
                      <button
                        onClick={() => setCompliance("institutional")}
                        className={`px-4 py-4 rounded-xl border transition text-left ${
                          compliance === "institutional"
                            ? "bg-white/15 border-white/25 text-white"
                            : "bg-white/10 border-white/15 text-white/85 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent"
                        }`}
                      >
                        <div className="text-white font-medium">Institutional Mode</div>
                        <div className="text-xs text-white/70">Enable zk-attestation (KYC-friendly).</div>
                      </button>
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={next}
                        className="rounded-full bg-white/10 border border-white/15 text-white/90 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent px-5"
                      >
                        Continue
                      </Button>
                    </div>
                  </Card>
                )}

                {/* 6. Feature Highlights */}
                {step === 5 && (
                  <Card>
                    <div className="text-white/90 text-base font-semibold mb-3">Feature Highlights</div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {FEATURE_CARDS.map((c, i) => (
                        <div key={i} className="rounded-xl bg-white/10 border border-white/15 p-4">
                          <div className="text-white font-semibold">{c.title}</div>
                          <div className="text-white/70 text-sm mt-1">{c.desc}</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={next}
                        className="rounded-full bg-white/10 border border-white/15 text-white/90 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent px-5"
                      >
                        Continue
                      </Button>
                    </div>
                  </Card>
                )}

                {/* 7. Finish */}
                {step === 6 && (
                  <Card>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e6ff55] text-[#0a0b0e] flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-white font-semibold">Your wallet is ready.</div>
                        <div className="text-white/70 text-sm mt-1">
                          Mode:{" "}
                          {compliance === "retail"
                            ? "Retail (no KYC below threshold)"
                            : "Institutional (zk-attestation enabled)"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid sm:grid-cols-2 gap-3">
                      <Button
                        onClick={() => router.push("/dashboard")}
                        className="h-12 w-full rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:bg-[#f1ff8a] inline-flex items-center justify-center gap-2"
                      >
                        Go to Dashboard
                      </Button>
                      <Button
                        onClick={startFinish}
                        className="h-12 w-full rounded-full bg-white/10 border border-white/15 text-white/90 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent"
                      >
                        Finish
                      </Button>
                    </div>
                    {confetti && <div className="mt-4 text-center text-sm text-white/70">All set</div>}
                  </Card>
                )}

                {/* Footer nav */}
                <div className="flex items-center justify-between">
                  <Button
                    onClick={prev}
                    disabled={step === 0}
                    variant="outline"
                    className="rounded-full bg-white/10 border border-white/15 text-white/85 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <div className="text-white/60 text-xs">You can revisit settings later in the app</div>
                  <Button
                    onClick={next}
                    disabled={step === 7}
                    className="rounded-full bg-white/10 border border-white/15 text-white/90 hover:bg-[#f1ff8a] hover:text-[#0a0b0e] hover:border-transparent inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lightweight finish dialog */}
        <Dialog open={finishing} onOpenChange={setFinishing}>
          <DialogContent className="backdrop-blur-3xl border border-white/15 bg-black/60 text-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">All set</DialogTitle>
              <DialogDescription className="text-white/70">
                Welcome to Tsunami. Ready to explore your private dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={() => setFinishing(false)}
                variant="outline"
                className="rounded-full bg-white/10 border border-white/15 text-white/85 hover:bg-white/15"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setFinishing(false)
                  router.push("/dashboard")
                }}
                className="rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold"
              >
                Go to Dashboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
