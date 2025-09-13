"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig, http } from "wagmi"
import { avalanche } from "wagmi/chains"
import { injected, metaMask } from "wagmi/connectors"
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

// Configure wagmi
const config = createConfig({
  chains: [avalancheChain],
  connectors: [
    injected(),
    metaMask()
  ],
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
