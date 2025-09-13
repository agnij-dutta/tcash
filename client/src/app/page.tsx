import Link from "next/link";

export default function Home() {
  return (
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

      {/* Hero */}
      <div className="w-full max-w-5xl mx-auto px-4 relative z-10 pt-24 pb-16">
        <div className="relative rounded-[32px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-0 pointer-events-none" style={{ background: "none" }} />
          <div className="absolute -inset-1 rounded-[36px] pointer-events-none" style={{ background: "none" }} />
          <div className="relative backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-[32px] p-8 sm:p-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.55)]" style={{ background: "transparent" }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow mb-5">
              <span className="text-black text-2xl">🌊</span>
            </div>
            <h1 className="text-white text-4xl sm:text-5xl font-extrabold tracking-tight">Tsunami Privacy</h1>
            <p className="text-white/75 text-base sm:text-lg mt-3 max-w-2xl mx-auto">Private. Compliant. DeFi-native. Deposit, swap, and withdraw with stealth addresses and zk-proofs.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/onboarding" className="h-12 px-8 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 text-white font-bold inline-flex items-center justify-center shadow-[0_10px_30px_rgba(99,102,241,0.45)] hover:brightness-110">
                Get Started
              </Link>
              <Link href="/dash" className="h-12 px-8 rounded-full bg-white/10 border border-white/15 text-white/90 hover:bg-white/15 inline-flex items-center justify-center">
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
