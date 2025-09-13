"use client"

import { useEERC } from "./useEERC"
import { useMemo } from "react"
import { CONTRACT_ADDRESSES } from "@/config/contracts"

export function useEncryptedBalance() {
  const eERC = useEERC()
  
  // Get the useEncryptedBalance hook from the eERC SDK with ERC20 token address
  const encryptedBalanceHook = eERC.useEncryptedBalance(CONTRACT_ADDRESSES.erc20)

  // Convert balance from wei to tokens using the actual decimals
  const decryptedBalance = useMemo(() => {
    if (!encryptedBalanceHook.decryptedBalance || !encryptedBalanceHook.decimals) return "0"
    const divisor = Math.pow(10, Number(encryptedBalanceHook.decimals))
    return (Number(encryptedBalanceHook.decryptedBalance) / divisor).toString()
  }, [encryptedBalanceHook.decryptedBalance, encryptedBalanceHook.decimals])

  // Convert balance to display format
  const balanceInTokens = useMemo(() => {
    if (!encryptedBalanceHook.decryptedBalance || !encryptedBalanceHook.decimals) return 0
    const divisor = Math.pow(10, Number(encryptedBalanceHook.decimals))
    return Number(encryptedBalanceHook.decryptedBalance) / divisor
  }, [encryptedBalanceHook.decryptedBalance, encryptedBalanceHook.decimals])

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
    hasBalance: balanceInTokens > 0,
  }
}
