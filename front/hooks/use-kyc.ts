"use client"

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

interface KYCData {
  isVerified: boolean
  verificationId?: string
  timestamp?: number
  error?: string
}

interface KYCStatus {
  data: KYCData
  isLoading: boolean
  error: string | null
}

export function useKYC() {
  const { address } = useAccount()
  const [kycStatus, setKycStatus] = useState<KYCStatus>({
    data: { isVerified: false },
    isLoading: false,
    error: null
  })

  // Check KYC status for connected wallet
  const checkKYCStatus = async (walletAddress: string) => {
    setKycStatus(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      // Simulate API call to check KYC status
      const response = await fetch(`/api/kyc/status?address=${walletAddress}`)
      
      if (!response.ok) {
        throw new Error('Failed to check KYC status')
      }
      
      const data = await response.json()
      setKycStatus({
        data: data.kycStatus || { isVerified: false },
        isLoading: false,
        error: null
      })
    } catch (error: any) {
      setKycStatus({
        data: { isVerified: false },
        isLoading: false,
        error: error.message
      })
    }
  }

  // Submit KYC verification
  const submitKYC = async (verificationData: any) => {
    setKycStatus(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch('/api/kyc/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          verificationData
        })
      })
      
      if (!response.ok) {
        throw new Error('KYC verification failed')
      }
      
      const result = await response.json()
      setKycStatus({
        data: result.kycStatus,
        isLoading: false,
        error: null
      })
      
      return result
    } catch (error: any) {
      setKycStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }))
      throw error
    }
  }

  // Clear KYC status
  const clearKYC = () => {
    setKycStatus({
      data: { isVerified: false },
      isLoading: false,
      error: null
    })
  }

  // Check KYC status when wallet connects
  useEffect(() => {
    if (address) {
      checkKYCStatus(address)
    } else {
      clearKYC()
    }
  }, [address])

  return {
    ...kycStatus,
    checkKYCStatus,
    submitKYC,
    clearKYC,
    isConnected: !!address
  }
}

