"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Clock, User, Shield, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface KYCStatus {
  isVerified: boolean
  verificationId?: string
  timestamp?: number
  error?: string
}

interface KYCVerificationProps {
  onVerificationComplete?: (status: KYCStatus) => void
  onVerificationError?: (error: string) => void
}

export default function KYCVerification({ 
  onVerificationComplete, 
  onVerificationError 
}: KYCVerificationProps) {
  const [kycStatus, setKycStatus] = useState<KYCStatus>({
    isVerified: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [verificationStep, setVerificationStep] = useState<'idle' | 'scanning' | 'processing' | 'complete' | 'error'>('idle')

  // Simulate KYC verification process
  const startKYCVerification = async () => {
    setIsLoading(true)
    setVerificationStep('scanning')
    
    try {
      // Simulate Self SDK integration
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate scanning
      
      setVerificationStep('processing')
      await new Promise(resolve => setTimeout(resolve, 3000)) // Simulate processing
      
      // Simulate successful verification
      const verificationResult: KYCStatus = {
        isVerified: true,
        verificationId: `KYC_${Date.now()}`,
        timestamp: Date.now()
      }
      
      setKycStatus(verificationResult)
      setVerificationStep('complete')
      toast.success("KYC verification completed successfully!")
      
      if (onVerificationComplete) {
        onVerificationComplete(verificationResult)
      }
      
    } catch (error: any) {
      const errorMessage = error.message || "KYC verification failed"
      setKycStatus({
        isVerified: false,
        error: errorMessage
      })
      setVerificationStep('error')
      toast.error(errorMessage)
      
      if (onVerificationError) {
        onVerificationError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resetVerification = () => {
    setKycStatus({ isVerified: false })
    setVerificationStep('idle')
  }

  const getStatusIcon = () => {
    if (kycStatus.isVerified) return <CheckCircle className="w-6 h-6 text-green-500" />
    if (kycStatus.error) return <XCircle className="w-6 h-6 text-red-500" />
    if (isLoading) return <Clock className="w-6 h-6 text-yellow-500 animate-spin" />
    return <User className="w-6 h-6 text-gray-500" />
  }

  const getStatusText = () => {
    if (kycStatus.isVerified) return "Verified"
    if (kycStatus.error) return "Failed"
    if (isLoading) return "Verifying..."
    return "Not Verified"
  }

  const getStatusColor = () => {
    if (kycStatus.isVerified) return "bg-green-500/20 text-green-400 border-green-500/30"
    if (kycStatus.error) return "bg-red-500/20 text-red-400 border-red-500/30"
    if (isLoading) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    return "bg-gray-500/20 text-gray-400 border-gray-500/30"
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Shield className="w-8 h-8 text-white" />
          <h2 className="text-3xl font-light tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            Identity Verification
          </h2>
        </div>
        <p className="text-white/70 max-w-lg mx-auto">
          Complete KYC verification to access private trading features. Your identity is verified using zero-knowledge proofs.
        </p>
      </div>

      {/* Status Card */}
      <Card className="backdrop-blur-xl bg-white/5 border-white/15 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-medium text-white">Verification Status</h3>
              <p className="text-sm text-white/60">
                {kycStatus.isVerified 
                  ? `Verified on ${new Date(kycStatus.timestamp!).toLocaleDateString()}`
                  : "Complete verification to access private features"
                }
              </p>
            </div>
          </div>
          <Badge className={`${getStatusColor()} border`}>
            {getStatusText()}
          </Badge>
        </div>

        {kycStatus.verificationId && (
          <div className="text-xs text-white/50 font-mono bg-black/20 p-2 rounded">
            ID: {kycStatus.verificationId}
          </div>
        )}

        {kycStatus.error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
            <AlertCircle className="w-4 h-4" />
            {kycStatus.error}
          </div>
        )}
      </Card>

      {/* Verification Steps */}
      {verificationStep !== 'idle' && (
        <Card className="backdrop-blur-xl bg-white/5 border-white/15 p-6">
          <h4 className="text-lg font-medium text-white mb-4">Verification Progress</h4>
          <div className="space-y-3">
            <div className={`flex items-center gap-3 ${verificationStep === 'scanning' || verificationStep === 'processing' || verificationStep === 'complete' ? 'text-white' : 'text-white/50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                verificationStep === 'scanning' || verificationStep === 'processing' || verificationStep === 'complete' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/20 text-white/50'
              }`}>
                {verificationStep === 'complete' ? '✓' : '1'}
              </div>
              <span>Scan your identity document</span>
            </div>
            
            <div className={`flex items-center gap-3 ${verificationStep === 'processing' || verificationStep === 'complete' ? 'text-white' : 'text-white/50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                verificationStep === 'processing' || verificationStep === 'complete' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/20 text-white/50'
              }`}>
                {verificationStep === 'complete' ? '✓' : '2'}
              </div>
              <span>Verify identity with zero-knowledge proof</span>
            </div>
            
            <div className={`flex items-center gap-3 ${verificationStep === 'complete' ? 'text-white' : 'text-white/50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                verificationStep === 'complete' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white/20 text-white/50'
              }`}>
                {verificationStep === 'complete' ? '✓' : '3'}
              </div>
              <span>Complete verification</span>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        {!kycStatus.isVerified && verificationStep === 'idle' && (
          <Button
            onClick={startKYCVerification}
            disabled={isLoading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105"
          >
            {isLoading ? "Verifying..." : "Start Verification"}
          </Button>
        )}

        {kycStatus.isVerified && (
          <Button
            onClick={resetVerification}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 px-8 py-3 rounded-lg font-medium"
          >
            Reset Verification
          </Button>
        )}

        {verificationStep === 'error' && (
          <Button
            onClick={resetVerification}
            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-8 py-3 rounded-lg font-medium"
          >
            Try Again
          </Button>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="text-center text-xs text-white/50 max-w-md mx-auto">
        <p>
          Your identity is verified using zero-knowledge proofs. 
          We never store your personal information or documents.
        </p>
      </div>
    </div>
  )
}

