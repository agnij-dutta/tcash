import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "../components/liquid-ether.css"
import Navbar from "../components/navbar"
import LiquidEther from "../components/liquid-ether"
import Providers from "../components/Providers"
import { use } from "react"
// Inline EERC config to avoid module resolution issues during initial wiring
const EERC_ADDRESSES = {
  encryptedERC: "0x271B03d3A18b2270764669EDa1696f0b43634764",
}
function getCircuitURLs(basePath: string = "/api/eerc/circuits") {
  return {
    register: { wasm: `${basePath}/registration/wasm`, zkey: `${basePath}/registration/zkey` },
    transfer: { wasm: `${basePath}/transfer/wasm`, zkey: `${basePath}/transfer/zkey` },
    mint: { wasm: `${basePath}/mint/wasm`, zkey: `${basePath}/mint/zkey` },
    withdraw: { wasm: `${basePath}/withdraw/wasm`, zkey: `${basePath}/withdraw/zkey` },
    burn: { wasm: `${basePath}/burn/wasm`, zkey: `${basePath}/burn/zkey` },
  } as const
}
// EERCProvider removed to avoid bundling SDK in client; SDK used server-side via API

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "tZunami - Private. Compliant. DeFi-native.",
  description: "Your tokens, your privacy. Built on Uniswap v4 + zkSNARKs.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white`}>
        <div className="fixed inset-0 z-0">
          <LiquidEther
            colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
            mouseForce={20}
            cursorSize={100}
            isViscous={false}
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.5}
            isBounce={false}
            autoDemo={true}
            autoSpeed={0.5}
            autoIntensity={2.2}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
          />
        </div>
        <Providers>
          <Navbar />
          <main >{children}</main>
        </Providers>
      </body>
    </html>
  )
}
