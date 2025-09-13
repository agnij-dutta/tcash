"use client"

import { useEERC } from "./useEERC"
import { useMemo } from "react"

export function useEncryptedBalance() {
  const eERC = useEERC()
  
  // Get the useEncryptedBalance hook from the eERC SDK
  const encryptedBalanceHook = eERC.useEncryptedBalance()

  // Convert balance from wei to tokens (assuming 18 decimals)
  const decryptedBalance = useMemo(() => {
    if (!encryptedBalanceHook.decryptedBalance) return "0"
    return (Number(encryptedBalanceHook.decryptedBalance) / Math.pow(10, 18)).toString()
  }, [encryptedBalanceHook.decryptedBalance])

  // Convert balance to display format
  const balanceInTokens = useMemo(() => {
    if (!encryptedBalanceHook.decryptedBalance) return 0
    return Number(encryptedBalanceHook.decryptedBalance) / Math.pow(10, 18)
  }, [encryptedBalanceHook.decryptedBalance])

  return {
    ...encryptedBalanceHook,
    decryptedBalance,
    balanceInTokens,
    // Additional helper methods
    formatBalance: (balance: string | number) => {
      const num = typeof balance === 'string' ? parseFloat(balance) : balance
      return num.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 6 
      })
    },
    isBalanceLoading: encryptedBalanceHook.isLoading,
    hasBalance: balanceInTokens > 0,
  }
}
