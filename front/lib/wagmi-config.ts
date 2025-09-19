'use client'

import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, avalancheFuji, celo, celoAlfajores } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet, metaMask } from 'wagmi/connectors'
import { defineChain } from 'viem'

// Define local Hardhat network
const hardhat = defineChain({
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8545'],
    },
  },
})

export const config = createConfig({
  chains: [hardhat, mainnet, sepolia, avalancheFuji, celo, celoAlfajores],
  connectors: [
    metaMask(),
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'a0c4767a4d4b9c8b8c8b8c8b8c8b8c8b8c'
    }),
    coinbaseWallet({
      appName: 'tZunami',
      appLogoUrl: '/placeholder-logo.png'
    }),
  ],
  transports: {
    [hardhat.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [avalancheFuji.id]: http(),
    [celo.id]: http(),
    [celoAlfajores.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}


