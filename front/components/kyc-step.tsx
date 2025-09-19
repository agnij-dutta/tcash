// SPDX-License-Identifier: MIT
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useSelfKYC } from '@/lib/sdk';
import { CheckCircle, AlertCircle, Loader2, Shield, User, Globe, FileText, KeyRound, EyeOff, Zap, Clock, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast, removeToast } from '@/components/simple-toast';
import { SelfQRCode } from '@/components/self-qr-code';
import { useAccount } from 'wagmi';

interface KYCStepProps {
  onKYCComplete?: (kycData: any) => void;
  onKYCError?: (error: string) => void;
  onSkip?: () => void;
  className?: string;
  mode?: 'onboarding' | 'standalone';
}

export function KYCStep({ 
  onKYCComplete, 
  onKYCError, 
  onSkip,
  className = '',
  mode = 'onboarding'
}: KYCStepProps) {
  const { address } = useAccount();
  const { 
    isVerified, 
    kycData, 
    isLoading, 
    error, 
    config, 
    verifyKYC, 
    clearError 
  } = useSelfKYC();
  
  const [proof, setProof] = useState<any>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [currentStep, setCurrentStep] = useState<'intro' | 'method' | 'qr' | 'mock' | 'proof' | 'verify'>('intro');
  const [qrStatus, setQrStatus] = useState<'waiting' | 'scanned' | 'processing' | 'completed' | 'error'>('waiting');
  const [sessionData, setSessionData] = useState<any>(null);
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  // Initialize session data when starting KYC
  useEffect(() => {
    if (currentStep === 'qr' && !sessionData) {
      const newSessionData = {
        scope: config?.scope || 'tcash-kyc-v2',
        configId: config?.configId || '1',
        endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/kyc/verify`,
        userId: address || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        requirements: {
          minimumAge: config?.minimumAge || 18,
          requireOfacCheck: config?.requireOfacCheck || true,
          allowedDocumentTypes: config?.allowedDocumentTypes || [1, 2],
          excludedCountries: config?.excludedCountries || [],
          verificationLevel: 'standard',
          complianceRequired: true
        }
      };
      setSessionData(newSessionData);
    }
  }, [currentStep, config, address]);

  const handleVerification = useCallback(async () => {
    if (!proof) {
      showToast('error', 'No proof provided');
      onKYCError?.('No proof provided');
      return;
    }

    try {
      setVerificationAttempts(prev => prev + 1);
      const loadingId = showToast('loading', 'Verifying KYC with blockchain...');
      
      // Simulate verification with realistic delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      removeToast(loadingId);
      
      // Enhanced mock result with more realistic data
      const mockResult = {
        success: true,
        kycData: {
          isVerified: true,
          nationality: proof.nationality,
          documentType: proof.documentType,
          isOfacClear: !proof.isOfacMatch,
          verificationCount: verificationAttempts,
          timestamp: Date.now(),
          nullifier: proof.nullifier,
          userIdentifier: proof.userIdentifier,
          attestationId: proof.attestationId,
          verificationLevel: 'standard',
          complianceScore: 95
        },
        onchainData: {
          transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
          blockNumber: Math.floor(Math.random() * 1000000) + 20000000,
          gasUsed: '125000',
          network: 'Celo Alfajores'
        }
      };
      
      setCurrentStep('verify');
      showToast('success', '🎉 KYC Verification Successful!', 'Your identity has been verified onchain and you can now access institutional features.');
      onKYCComplete?.(mockResult.kycData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast('error', 'KYC Verification Error', errorMessage);
      onKYCError?.(errorMessage);
    }
  }, [proof, onKYCComplete, onKYCError, verificationAttempts]);

  const generateMockProof = useCallback(async () => {
    setIsGeneratingProof(true);
    setCurrentStep('mock');
    const loadingId = showToast('loading', 'Generating Self.xyz proof...');
    
    // Simulate realistic proof generation delay
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    removeToast(loadingId);
    
    const mockProof = {
      nullifier: '0x' + Math.random().toString(16).substr(2, 64),
      userIdentifier: '0x' + Math.random().toString(16).substr(2, 64),
      nationality: 'US',
      documentType: 1, // E-Passport
      ageAtLeast: 25,
      isOfacMatch: false,
      attestationId: '0x' + Math.random().toString(16).substr(2, 64),
      proof: '0x' + Array.from({length: 128}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: Date.now(),
      verificationLevel: 'standard',
      documentCountry: 'US',
      issueDate: Date.now() - (365 * 24 * 60 * 60 * 1000 * 3), // 3 years ago
      expiryDate: Date.now() + (365 * 24 * 60 * 60 * 1000 * 7), // 7 years from now
    };
    
    setProof(mockProof);
    setCurrentStep('proof');
    setIsGeneratingProof(false);
    showToast('success', '✅ Proof Generated Successfully!', 'Your Self.xyz proof is ready for onchain verification.');
  }, []);

  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  const handleQRScan = useCallback(() => {
    showToast('info', '📱 QR Code Scanned', 'Please complete verification in the Self.xyz app.');
    setQrStatus('scanned');
    
    // Simulate processing flow
    setTimeout(() => {
      setQrStatus('processing');
      showToast('loading', 'Processing verification in Self.xyz app...');
    }, 2000);
    
    setTimeout(() => {
      setQrStatus('completed');
      generateMockProof();
    }, 6000);
  }, [generateMockProof]);

  const handleQRStatusUpdate = useCallback((status: typeof qrStatus) => {
    setQrStatus(status);
  }, []);

  const handleQRError = useCallback((error: string) => {
    showToast('error', 'QR Code Error', error);
    setQrStatus('error');
  }, []);

  // Render verified state
  if (isVerified && kycData) {
    return (
      <div className={`backdrop-blur-3xl backdrop-saturate-200 border border-green-500/40 rounded-2xl px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)] ${className}`} style={{ background: "rgba(34, 197, 94, 0.08)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-green-400">KYC Verified</h3>
            <p className="text-sm text-green-300/70">Identity verification complete</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Globe className="w-4 h-4 text-green-400/60" />
            <span>Nationality: {kycData.nationality}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <FileText className="w-4 h-4 text-green-400/60" />
            <span>Document: {kycData.documentType === 1 ? 'E-Passport' : 'EU ID Card'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Shield className="w-4 h-4 text-green-400/60" />
            <span>OFAC Clear: {kycData.isOfacClear ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <User className="w-4 h-4 text-green-400/60" />
            <span>Verifications: {kycData.verificationCount}</span>
          </div>
        </div>

        {kycData.verificationCount && kycData.verificationCount > 1 && (
          <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Verification Score</span>
              <span className="text-green-400 font-semibold">Verified</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render main KYC flow
  return (
    <div className={`backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)] ${className}`} style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">KYC Verification</h2>
          <p className="text-sm text-white/60">Complete identity verification for compliance</p>
        </div>
      </div>

      {config && (
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Requirements:
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3" />
              Minimum age: {config.minimumAge}
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3" />
              OFAC check: {config.requireOfacCheck ? 'Required' : 'Not required'}
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              Document types: {config.allowedDocumentTypes.map(t => t === 1 ? 'E-Passport' : 'EU ID Card').join(', ')}
            </div>
            {config.excludedCountries.length > 0 && (
              <div className="flex items-center gap-2">
                <Globe className="w-3 h-3" />
                Excluded: {config.excludedCountries.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step Flow */}
      {currentStep === 'intro' && (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-sm text-white/70 leading-relaxed max-w-md mx-auto">
              {mode === 'onboarding' 
                ? 'Complete KYC verification to enable advanced privacy features and institutional compliance.'
                : 'Verify your identity to access enhanced features and meet regulatory requirements.'
              }
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={() => setCurrentStep('method')}
              className="w-full rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 px-5 py-3 font-medium"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start KYC Verification
            </Button>
            {onSkip && mode === 'onboarding' && (
              <Button
                onClick={() => {
                  showToast('warning', '⚠️ KYC Skipped', 'You can complete KYC verification later in settings.');
                  onSkip();
                }}
                variant="outline"
                className="w-full rounded-full border-white/15 text-white/70 hover:bg-white/10 px-5 py-3 bg-transparent"
              >
                Skip for Now
              </Button>
            )}
          </div>
        </div>
      )}

      {currentStep === 'method' && (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-white">Choose Verification Method</h3>
            <p className="text-sm text-white/60">
              Select how you'd like to complete your identity verification
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => setCurrentStep('qr')}
              className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-white">Self.xyz Mobile App</h4>
                  <p className="text-sm text-white/60">Secure, private verification using ZK proofs</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setCurrentStep('mock')}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <EyeOff className="w-5 h-5 text-white/70" />
                </div>
                <div>
                  <h4 className="font-medium text-white">Demo Mode</h4>
                  <p className="text-sm text-white/60">Generate mock proof for testing (Development only)</p>
                </div>
              </div>
            </button>
          </div>
          
          <Button
            onClick={() => setCurrentStep('intro')}
            variant="outline"
            className="w-full rounded-full border-white/15 text-white/70 hover:bg-white/10 px-5 py-3 bg-transparent"
          >
            Back
          </Button>
        </div>
      )}

      {currentStep === 'qr' && sessionData && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Scan QR Code</h3>
            <p className="text-sm text-white/60">
              Use the Self.xyz mobile app to scan and verify your identity
            </p>
          </div>
          
          <div className="flex justify-center">
            <SelfQRCode 
              sessionData={sessionData}
              onScan={handleQRScan}
              onError={handleQRError}
              onStatusUpdate={handleQRStatusUpdate}
              autoRefresh={true}
            />
          </div>
          
          <Button
            onClick={() => setCurrentStep('method')}
            variant="outline"
            className="w-full rounded-full border-white/15 text-white/70 hover:bg-white/10 px-5 py-3 bg-transparent"
          >
            Back to Methods
          </Button>
        </div>
      )}

      {currentStep === 'mock' && (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              {isGeneratingProof ? (
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              ) : (
                <EyeOff className="w-8 h-8 text-white" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-white">Demo Verification</h3>
            <p className="text-sm text-white/60 max-w-sm mx-auto">
              This will generate a mock Self.xyz proof for testing purposes. In production, use the mobile app verification.
            </p>
          </div>
          
          <Button
            onClick={generateMockProof}
            disabled={isGeneratingProof}
            className="w-full rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15 px-5 py-3 font-medium"
          >
            {isGeneratingProof ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating Mock Proof...
              </>
            ) : (
              '🔧 Generate Demo Proof'
            )}
          </Button>
          
          <Button
            onClick={() => setCurrentStep('method')}
            variant="outline"
            className="w-full rounded-full border-white/15 text-white/70 hover:bg-white/10 px-5 py-3 bg-transparent"
          >
            Back to Methods
          </Button>
        </div>
      )}

      {currentStep === 'proof' && proof && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Proof Generated</h3>
            <p className="text-sm text-white/60">
              Your Self.xyz proof is ready for onchain verification
            </p>
          </div>
          
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Verification Data:
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-white/80">
                <Globe className="w-4 h-4 text-white/60" />
                <span>Nationality: {proof.nationality}</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <FileText className="w-4 h-4 text-white/60" />
                <span>Document: {proof.documentType === 1 ? 'E-Passport' : 'EU ID Card'}</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <User className="w-4 h-4 text-white/60" />
                <span>Age: {proof.ageAtLeast}+</span>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Shield className="w-4 h-4 text-white/60" />
                <span>OFAC Clear: {proof.isOfacMatch ? 'No' : 'Yes'}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-white/50 space-y-1">
                <div>Nullifier: {proof.nullifier.slice(0, 10)}...{proof.nullifier.slice(-10)}</div>
                <div>Attestation: {proof.attestationId.slice(0, 10)}...{proof.attestationId.slice(-10)}</div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Generated: {new Date(proof.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleVerification}
              disabled={isLoading}
              className="flex-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 px-5 py-3 font-medium"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying Onchain...
                </>
              ) : (
                '✅ Submit to Blockchain'
              )}
            </Button>
            
            <Button
              onClick={() => {
                setProof(null);
                setCurrentStep('method');
              }}
              variant="outline"
              className="rounded-full border-white/15 text-white/70 hover:bg-white/10 px-5 py-3 bg-transparent"
            >
              🔄 Start Over
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-300">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm flex-1">{error}</span>
          <button onClick={handleClearError} className="ml-auto text-red-400 hover:text-red-300">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
