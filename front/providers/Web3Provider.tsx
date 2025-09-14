"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig, http } from "wagmi"
import { avalancheFuji } from "wagmi/chains"
import { privateKeyToAccount } from "viem/accounts"
import { createPublicClient, createWalletClient, custom } from "viem"
import { ReactNode, useState } from "react"
import { NETWORK_CONFIG } from "@/config/contracts"

// Use Avalanche Fuji testnet directly
const avalancheChain = avalancheFuji

// Create account from private key
const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY 
if (!privateKey) {
  throw new Error('NEXT_PUBLIC_PRIVATE_KEY environment variable is required')
}
const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}`)

// Create public and wallet clients
const publicClient = createPublicClient({
  chain: avalancheChain,
  transport: http()
})

const walletClient = createWalletClient({
  account,
  chain: avalancheChain,
  transport: custom(publicClient)
})

// Configure wagmi with direct wallet connection
const config = createConfig({
  chains: [avalancheChain],
  connectors: [], // No connectors needed - using direct wallet
  transports: {
    [avalancheChain.id]: http(),
  },
})

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// Export the config for use in other components
export { config }
