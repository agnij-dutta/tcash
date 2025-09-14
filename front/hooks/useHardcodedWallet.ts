"use client"

import { useMemo } from "react"
import { privateKeyToAccount } from "viem/accounts"
import { createPublicClient, createWalletClient, custom, http } from "viem"
import { avalancheFuji } from "wagmi/chains"

// Use Avalanche Fuji testnet directly
const avalancheChain = avalancheFuji

export function useHardcodedWallet() {
  const walletData = useMemo(() => {
    try {
      // Get private key from environment or use hardcoded fallback
      const privateKey = process.env.NEXT_PUBLIC_PRIVATE_KEY || '95492791d9e40b7771b8b57117c399cc5e27d99d4959b7f9592925a398be7bdb'
      const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`)
      
      console.log("Creating hardcoded wallet with address:", account.address)
      
      // Create public client
      const publicClient = createPublicClient({
        chain: avalancheChain,
        transport: http()
      })
      
      // Create wallet client
      const walletClient = createWalletClient({
        account,
        chain: avalancheChain,
        transport: custom(publicClient)
      })
      
      console.log("Hardcoded wallet created successfully:", {
        address: account.address,
        chainId: avalancheChain.id,
        rpcUrl: avalancheChain.rpcUrls.default.http[0]
      })
      
      return {
        address: account.address,
        isConnected: true,
        publicClient,
        walletClient,
        account
      }
    } catch (error) {
      console.error("Failed to create hardcoded wallet:", error)
      return {
        address: undefined,
        isConnected: false,
        publicClient: undefined,
        walletClient: undefined,
        account: undefined
      }
    }
  }, [])

  return walletData
}
