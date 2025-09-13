"use client"

import { usePublicClient, useWalletClient } from "wagmi"
import { useEERC as useEERCSDK } from "@avalabs/eerc-sdk"
import { CONTRACT_ADDRESSES, CIRCUIT_URLS } from "@/config/contracts"
import { useEffect, useState } from "react"

export function useEERC() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [decryptionKey, setDecryptionKey] = useState<string | undefined>()

  // Initialize eERC SDK
  const eERC = useEERCSDK(
    publicClient as any,
    walletClient as any,
    CONTRACT_ADDRESSES.eERC,
    CIRCUIT_URLS,
    decryptionKey
  )

  // Debug logging
  useEffect(() => {
    console.log("eERC Hook State:", {
      hasPublicClient: !!publicClient,
      hasWalletClient: !!walletClient,
      hasDecryptionKey: !!decryptionKey,
      isInitialized: eERC.isInitialized,
      contractAddress: CONTRACT_ADDRESSES.eERC
    })
  }, [publicClient, walletClient, decryptionKey, eERC.isInitialized])

  // Load decryption key from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('eerc-decryption-key')
    if (storedKey) {
      setDecryptionKey(storedKey)
    }
  }, [])

  // Save decryption key to localStorage when it changes
  const handleRegister = async () => {
    try {
      const result = await eERC.register()
      if (result.key) {
        setDecryptionKey(result.key)
        localStorage.setItem('eerc-decryption-key', result.key)
      }
      return result
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    }
  }

  const handleGenerateDecryptionKey = async () => {
    try {
      const key = await eERC.generateDecryptionKey()
      setDecryptionKey(key)
      localStorage.setItem('eerc-decryption-key', key)
      return key
    } catch (error) {
      console.error('Decryption key generation failed:', error)
      throw error
    }
  }

  return {
    ...eERC,
    register: handleRegister,
    generateDecryptionKey: handleGenerateDecryptionKey,
    isConnected: !!walletClient,
    isInitialized: eERC.isInitialized && !!publicClient && !!walletClient,
  }
}
