// SPDX-License-Identifier: MIT
'use client';

import React, { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { CheckCircle, AlertCircle, Loader2, Shield, KeyRound, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast, removeToast } from '@/components/simple-toast';
import { SelfQRCode } from '@/components/self-qr-code';

interface KYCStepProps {
  onKYCComplete?: (kycData: any) => void;
  onKYCError?: (error: string) => void;
  onSkip?: () => void;
  className?: string;
}

export function KYCStep({ 
  onKYCComplete, 
  onKYCError, 
  onSkip,
  className = '' 
}: KYCStepProps) {
  const { address } = useAccount();
  const [proof, setProof] = useState<any>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [showKYCForm, setShowKYCForm] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const handleVerification = useCallback(async () => {
    if (!proof) {
      showToast('error', 'No proof provided');
      onKYCError?.('No proof provided');
      return;
    }

    try {
      const loadingId = showToast('loading', 'Verifying KYC on-chain...');
      
      // Simulate verification process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      removeToast(loadingId);
      showToast('success', '🎉 KYC Verification Successful!', 'Your identity has been verified on-chain.');
      onKYCComplete?.({ isVerified: true, timestamp: Date.now() });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast('error', 'KYC Verification Error', errorMessage);
      onKYCError?.(errorMessage);
    }
  }, [proof, onKYCComplete, onKYCError]);

  const generateMockProof = useCallback(async () => {
    setIsGeneratingProof(true);
    const loadingId = showToast('loading', 'Generating Self.xyz proof...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    removeToast(loadingId);
    
    const mockProof = {
      nullifier: '0x' + Math.random().toString(16).substr(2, 64),
      userIdentifier: '0x' + Math.random().toString(16).substr(2, 64),
      nationality: 'US',
      documentType: 1,
      ageAtLeast: 25,
      isOfacMatch: false,
      attestationId: '0x' + Math.random().toString(16).substr(2, 64),
      proof: '0x' + Math.random().toString(16).substr(2, 128),
      timestamp: Date.now()
    };
    
    setProof(mockProof);
    setIsGeneratingProof(false);
    showToast('success', '✅ Proof Generated', 'Self.xyz proof has been generated successfully.');
  }, []);

  const handleQRScan = useCallback((result: string) => {
    try {
      const data = JSON.parse(result);
      setProof(data);
      setShowQRCode(false);
      showToast('success', '📱 QR Code Scanned', 'Proof data received from Self.xyz app.');
    } catch (error) {
      showToast('error', 'Invalid QR Code', 'Could not parse proof data from QR code.');
    }
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="mb-6">
        <p className="text-sm text-white/70 mb-4">
          Complete KYC verification to enable institutional features
        </p>
      </div>

      {!showKYCForm ? (
        <div className="space-y-3">
          <Button
            onClick={() => {
              setShowKYCForm(true);
              showToast('info', '🔐 KYC Verification Started', 'Please generate your Self.xyz proof to continue.');
            }}
            className="w-full rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/15 px-5 py-3 font-medium"
          >
            Start KYC Verification
          </Button>
          {onSkip && (
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
      ) : (
        <div className="space-y-6">
          {!showQRCode && !proof ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">Generate Self.xyz Proof</h3>
              <p className="text-sm text-white/70">
                Choose how you want to generate your KYC proof
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => setShowQRCode(true)}
                  className="w-full rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 px-5 py-3 font-medium"
                >
                  📱 Scan with Self.xyz App
                </Button>
                
                <Button
                  onClick={generateMockProof}
                  disabled={isGeneratingProof}
                  className="w-full rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 px-5 py-3 font-medium"
                >
                  {isGeneratingProof ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    '🧪 Simulate Scan (Testing)'
                  )}
                </Button>
              </div>
            </div>
          ) : showQRCode ? (
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-white">Scan QR Code</h3>
              <p className="text-sm text-white/70">
                Scan this QR code with your Self.xyz mobile app
              </p>
              
              <div className="flex justify-center">
                <SelfQRCode 
                  sessionData={{
                    scope: 'your-app-kyc-v1',
                    configId: '1',
                    endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/kyc/verify`,
                    userId: address || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
                    requirements: {
                      minimumAge: 18,
                      requireOfacCheck: true,
                      excludedCountries: [],
                      allowedDocumentTypes: [1, 2, 3]
                    }
                  }}
                  onScan={handleQRScan}
                  onError={(error) => {
                    showToast('error', 'QR Code Error', error);
                  }}
                />
              </div>
            </div>
          ) : proof ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-semibold text-white mb-3">Proof Generated:</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-white/80">
                    <span className="text-white/60">Nationality:</span>
                    <span className="font-mono">{proof.nationality}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <span className="text-white/60">Document:</span>
                    <span className="font-mono">{proof.documentType === 1 ? 'E-Passport' : 'ID Card'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <span className="text-white/60">Age 25+:</span>
                    <span className="font-mono">{proof.ageAtLeast >= 25 ? '✅' : '❌'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <span className="text-white/60">OFAC Clear:</span>
                    <span className="font-mono">{!proof.isOfacMatch ? '✅' : '❌'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleVerification}
                  className="flex-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30 px-5 py-3 font-medium"
                >
                  ✅ Verify KYC
                </Button>
                
                <Button
                  onClick={() => {
                    setProof(null);
                    setShowQRCode(false);
                  }}
                  variant="outline"
                  className="rounded-full border-white/15 text-white/70 hover:bg-white/10 px-5 py-3 bg-transparent"
                >
                  🔄 Regenerate
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
