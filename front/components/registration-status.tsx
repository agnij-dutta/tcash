"use client"

import { useState, useEffect } from "react"
import { useAccount } from "wagmi"
import { useEERC } from "@/hooks/useEERC"
import { 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Key,
  Lock,
  Eye,
  EyeOff,
  Info
} from "lucide-react"
import { Button } from "./ui/button"
import { Progress } from "./ui/progress"
import { RegistrationInfo } from "./registration-info"

interface RegistrationStatusProps {
  onRegistrationComplete?: () => void
}

export function RegistrationStatus({ onRegistrationComplete }: RegistrationStatusProps) {
  const { address, isConnected } = useAccount()
  const { 
    isInitialized, 
    isRegistered, 
    register, 
    generateDecryptionKey,
    isDecryptionKeySet,
    publicKey,
    auditorPublicKey
  } = useEERC()
  
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationStep, setRegistrationStep] = useState<'keygen' | 'proof' | 'submit' | 'complete'>('keygen')
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [decryptionKey, setDecryptionKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Registration steps with descriptions
  const steps = [
    {
      id: 'keygen',
      title: 'Generate Cryptographic Keys',
      description: 'Creating your unique private key and public key pair for encrypted operations',
      icon: Key
    },
    {
      id: 'proof',
      title: 'Generate ZK Proof',
      description: 'Creating zero-knowledge proof to verify your registration without exposing private data',
      icon: Lock
    },
    {
      id: 'submit',
      title: 'Submit to Registrar',
      description: 'Registering your public key with the eERC registrar contract',
      icon: Shield
    },
    {
      id: 'complete',
      title: 'Registration Complete',
      description: 'Your cryptographic identity is now established and ready for private operations',
      icon: CheckCircle2
    }
  ]

  const currentStepIndex = steps.findIndex(step => step.id === registrationStep)
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleRegistration = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first")
      return
    }

    try {
      setIsRegistering(true)
      setError(null)
      
      // Step 1: Generate decryption key
      setRegistrationStep('keygen')
      const key = await generateDecryptionKey()
      setDecryptionKey(key)
      
      // Step 2: Generate ZK proof (handled by eERC SDK)
      setRegistrationStep('proof')
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate proof generation
      
      // Step 3: Submit registration
      setRegistrationStep('submit')
      const result = await register()
      
      // Step 4: Complete
      setRegistrationStep('complete')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      onRegistrationComplete?.()
      
    } catch (err) {
      console.error('Registration failed:', err)
      setError(err instanceof Error ? err.message : 'Registration failed')
      setRegistrationStep('keygen')
    } finally {
      setIsRegistering(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center space-y-4">
        <Shield className="w-16 h-16 text-white/60 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Connect Your Wallet</h2>
        <p className="text-white/60">Please connect your wallet to begin registration</p>
      </div>
    )
  }

  if (isRegistered) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Registration Complete</h2>
        <p className="text-white/60">Your cryptographic identity is established and ready for private operations</p>
        
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-sm font-semibold text-white/90 mb-2">Registration Details</h3>
          <div className="space-y-2 text-xs text-white/70">
            <div className="flex justify-between">
              <span>Wallet Address:</span>
              <span className="font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Public Key:</span>
              <span className="font-mono">
                {publicKey ? `${publicKey[0]?.toString().slice(0, 8)}...` : 'Generating...'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Decryption Key:</span>
              <span className="font-mono">
                {isDecryptionKeySet ? '✓ Set' : 'Not set'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <Shield className="w-12 h-12 text-white/60 mx-auto" />
        <h2 className="text-xl font-bold text-white">Register with eERC</h2>
        <p className="text-white/60 text-sm">
          Create your cryptographic identity to start using private encrypted tokens
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Registration Process */}
        <div className="space-y-6">

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-white/60">
          <span>Registration Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Current Step */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = step.id === registrationStep
          const isCompleted = currentStepIndex > index
          const Icon = step.icon
          
          return (
            <div 
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                isActive 
                  ? 'bg-white/10 border border-white/20' 
                  : isCompleted 
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCompleted 
                  ? 'bg-emerald-500 text-white' 
                  : isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-white/10 text-white/60'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isActive && isRegistering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-semibold ${
                  isActive ? 'text-white' : isCompleted ? 'text-emerald-300' : 'text-white/70'
                }`}>
                  {step.title}
                </h3>
                <p className="text-xs text-white/60 mt-1">
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Decryption Key Display */}
      {decryptionKey && (
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white/90">Your Decryption Key</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrivateKey(!showPrivateKey)}
              className="h-6 w-6 p-0"
            >
              {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
          </div>
          <div className="font-mono text-xs text-white/70 break-all">
            {showPrivateKey ? decryptionKey : '•'.repeat(64)}
          </div>
          <p className="text-xs text-yellow-400 mt-2">
            ⚠️ Save this key securely. You'll need it to decrypt your private transactions.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={handleRegistration}
        disabled={isRegistering || !isInitialized}
        className="w-full h-12 bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition disabled:opacity-60"
      >
        {isRegistering ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            {registrationStep === 'keygen' && 'Generating Keys...'}
            {registrationStep === 'proof' && 'Creating ZK Proof...'}
            {registrationStep === 'submit' && 'Submitting Registration...'}
            {registrationStep === 'complete' && 'Completing...'}
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Start Registration
          </>
        )}
      </Button>

          {/* Info */}
          <div className="text-xs text-white/50 text-center">
            Registration creates your cryptographic identity using zero-knowledge proofs.
            Your private key never leaves your device.
          </div>
        </div>

        {/* Registration Information */}
        <div className="space-y-6">
          <RegistrationInfo />
        </div>
      </div>
    </div>
  )
}
