"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig, http } from "wagmi"
import { avalanche } from "wagmi/chains"
import { privateKeyToAccount } from "viem/accounts"
import { createPublicClient, createWalletClient, custom } from "viem"
import { ReactNode, useState } from "react"
import { NETWORK_CONFIG } from "@/config/contracts"

// Create a custom Avalanche chain configuration
const avalancheChain = {
  ...avalanche,
  id: NETWORK_CONFIG.chainId,
  name: NETWORK_CONFIG.name,
  rpcUrls: {
    default: { http: [NETWORK_CONFIG.rpcUrl] },
    public: { http: [NETWORK_CONFIG.rpcUrl] }
  },
  blockExplorers: {
    default: { name: 'Snowtrace', url: NETWORK_CONFIG.blockExplorer }
  }
}

// Create account from private key
const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY || '95492791d9e40b7771b8b57117c399cc5e27d99d4959b7f9592925a398be7bdb'
const account = privateKeyToAccount(`0x${privateKey}`)

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
