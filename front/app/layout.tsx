import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import "../components/liquid-ether.css"
import Navbar from "../components/navbar"
// import LiquidEther from "../components/liquid-ether"
import { Toaster } from "@/components/ui/sonner"
import ClientProviders from "./providers"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

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
      <body className={`${inter.variable} font-sans bg-black text-white tz-metal min-h-screen overflow-x-hidden`}>
        <ClientProviders>
        {/* Global metallic gradient defs for strokes and text backgrounds */}
        <svg aria-hidden="true" width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="metallic-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#d4d4d4" />
              <stop offset="100%" stopColor="#737373" />
            </linearGradient>
          </defs>
        </svg>
        {/* <div className="fixed inset-0 z-0">
          <LiquidEther
            colors={["#ffffff", "#d4d4d4", "#737373"]}
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
        </div> */}

        <Navbar />

        {/* Page content */}
        <div className="relative z-10">{children}</div>
        <Toaster position="top-right" richColors />
        </ClientProviders>
      </body>
    </html>
  )
}
