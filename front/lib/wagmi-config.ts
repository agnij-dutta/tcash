'use client'

import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, avalancheFuji, celo, celoAlfajores } from 'wagmi/chains'
import { 
  injected, 
  coinbaseWallet,
  walletConnect
} from 'wagmi/connectors'

export const config = createConfig({
  chains: [
    celoAlfajores,  // Celo Alfajores Testnet (primary for testing)
    celo,           // Celo Mainnet
    mainnet, 
    sepolia, 
    avalancheFuji
  ],
  connectors: [
    // Generic injected (MetaMask, Brave, etc.)
    injected({
      target: 'metaMask',
    }),
    
    // Coinbase Wallet
    coinbaseWallet({
      appName: 'T-Cash',
      appLogoUrl: 'https://tcash.app/logo.png',
      darkMode: true,
    }),

    // WalletConnect v2
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
      metadata: {
        name: 'T-Cash',
        description: 'Private. Compliant. DeFi-native.',
        url: 'https://tcash.app',
        icons: ['https://tcash.app/logo.png'],
      },
    }),
  ],
  transports: {
    [celoAlfajores.id]: http('https://alfajores-forno.celo-testnet.org'),
    [celo.id]: http('https://forno.celo.org'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [avalancheFuji.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
