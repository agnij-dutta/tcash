import { useState, useEffect, useCallback } from 'react'
import { TsunamiSDK } from '../core/TsunamiSDK'
import type { SDKConfig, EncryptedBalance, BatchStatus } from '../core/types'

/**
 * Main React hook for Tsunami SDK
 */
export function useTsunamiSDK(config: SDKConfig) {
  const [sdk, setSdk] = useState<TsunamiSDK | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const tsunamiSDK = new TsunamiSDK(config)
      setSdk(tsunamiSDK)
      setIsInitialized(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize SDK')
      setIsInitialized(false)
    }
  }, [config])

  return {
    sdk,
    isInitialized,
    error
  }
}

/**
 * Hook for deposit operations
 */
export function useDeposit(sdk: TsunamiSDK | null) {
  const [isDepositing, setIsDepositing] = useState(false)
  const [depositResult, setDepositResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const deposit = useCallback(async (params: {
    token: string
    amount: string
    denomination?: number
  }) => {
    if (!sdk) {
      setError('SDK not initialized')
      return
    }

    setIsDepositing(true)
    setError(null)

    try {
      const result = await sdk.deposit(params)
      setDepositResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsDepositing(false)
    }
  }, [sdk])

  return {
    deposit,
    isDepositing,
    depositResult,
    error
  }
}

/**
 * Hook for withdraw operations
 */
export function useWithdraw(sdk: TsunamiSDK | null) {
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawResult, setWithdrawResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const withdraw = useCallback(async (params: {
    tokenId: number
    amount: string
    recipient: string
    nullifier: string
    balancePCT: [bigint, bigint, bigint, bigint, bigint, bigint, bigint]
  }) => {
    if (!sdk) {
      setError('SDK not initialized')
      return
    }

    setIsWithdrawing(true)
    setError(null)

    try {
      const result = await sdk.withdraw(params)
      setWithdrawResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Withdraw failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsWithdrawing(false)
    }
  }, [sdk])

  return {
    withdraw,
    isWithdrawing,
    withdrawResult,
    error
  }
}

/**
 * Hook for swap operations
 */
export function useSwap(sdk: TsunamiSDK | null) {
  const [isSwapping, setIsSwapping] = useState(false)
  const [swapResult, setSwapResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const swap = useCallback(async (params: {
    tokenIn: string
    tokenOut: string
    amountIn: string
    minAmountOut: string
    recipient: string
    deadline: number
  }) => {
    if (!sdk) {
      setError('SDK not initialized')
      return
    }

    setIsSwapping(true)
    setError(null)

    try {
      const result = await sdk.swap(params)
      setSwapResult(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Swap failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsSwapping(false)
    }
  }, [sdk])

  return {
    swap,
    isSwapping,
    swapResult,
    error
  }
}

/**
 * Hook for encrypted balance
 */
export function useEncryptedBalance(sdk: TsunamiSDK | null, user: string, tokenId: number) {
  const [balance, setBalance] = useState<EncryptedBalance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!sdk || !user) return

    setIsLoading(true)
    setError(null)

    try {
      const encryptedBalance = await sdk.getEncryptedBalance(user, tokenId)
      setBalance(encryptedBalance)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [sdk, user, tokenId])

  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance
  }
}

/**
 * Hook for batch status
 */
export function useBatchStatus(sdk: TsunamiSDK | null) {
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBatchStatus = useCallback(async () => {
    if (!sdk) return

    setIsLoading(true)
    setError(null)

    try {
      const status = await sdk.getBatchStatus()
      setBatchStatus(status)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch status'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    fetchBatchStatus()
    const interval = setInterval(fetchBatchStatus, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [fetchBatchStatus])

  return {
    batchStatus,
    isLoading,
    error,
    refetch: fetchBatchStatus
  }
}

/**
 * Hook for user registration
 */
export function useRegistration(sdk: TsunamiSDK | null) {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkRegistration = useCallback(async (user: string) => {
    if (!sdk || !user) return

    try {
      const registered = await sdk.isUserRegistered(user)
      setIsRegistered(registered)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check registration'
      setError(errorMessage)
    }
  }, [sdk])

  const register = useCallback(async () => {
    if (!sdk) {
      setError('SDK not initialized')
      return
    }

    setIsRegistering(true)
    setError(null)

    try {
      const txHash = await sdk.registerUser()
      return txHash
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsRegistering(false)
    }
  }, [sdk])

  return {
    isRegistered,
    isRegistering,
    error,
    checkRegistration,
    register
  }
}

/**
 * Hook for supported tokens
 */
export function useSupportedTokens(sdk: TsunamiSDK | null) {
  const [tokens, setTokens] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    if (!sdk) return

    setIsLoading(true)
    setError(null)

    try {
      const supportedTokens = await sdk.getSupportedTokens()
      setTokens(supportedTokens)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tokens'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [sdk])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  return {
    tokens,
    isLoading,
    error,
    refetch: fetchTokens
  }
}

