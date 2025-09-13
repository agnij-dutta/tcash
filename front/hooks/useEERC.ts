"use client"

import { useEERC as useEERCSDK } from "@avalabs/eerc-sdk"
import { CONTRACT_ADDRESSES, CIRCUIT_URLS } from "@/config/contracts"
import { useEffect, useState } from "react"
import { useHardcodedWallet } from "./useHardcodedWallet"

export function useEERC() {
  const { publicClient, walletClient, isConnected } = useHardcodedWallet()
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
      contractAddress: CONTRACT_ADDRESSES.eERC,
      circuitUrls: CIRCUIT_URLS,
      eERCKeys: Object.keys(eERC)
    })
  }, [publicClient, walletClient, decryptionKey, eERC.isInitialized])

  // Test circuit file accessibility
  useEffect(() => {
    if (publicClient && walletClient) {
      console.log("Testing circuit file accessibility...")
      fetch('/circuits/registration/registration.wasm')
        .then(response => {
          console.log("Registration WASM accessible:", response.ok, response.status)
          return response.blob()
        })
        .then(blob => {
          console.log("Registration WASM size:", blob.size)
        })
        .catch(error => {
          console.error("Failed to fetch registration WASM:", error)
        })
    }
  }, [publicClient, walletClient])

  // Add timeout for initialization
  useEffect(() => {
    if (publicClient && walletClient && !eERC.isInitialized) {
      const timeout = setTimeout(() => {
        console.warn("eERC SDK initialization timeout - this might indicate a configuration issue")
      }, 10000) // 10 second timeout

      return () => clearTimeout(timeout)
    }
  }, [publicClient, walletClient, eERC.isInitialized])

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
    isConnected,
    isInitialized: eERC.isInitialized && !!publicClient && !!walletClient,
  }
}
