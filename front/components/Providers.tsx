"use client"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"
import { wagmiConfig } from "@/lib/wagmi"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = React.useState(() => new QueryClient())
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}


