'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, Smartphone, Shield, CheckCircle } from 'lucide-react';

interface SelfQRCodeProps {
  sessionData: {
    scope: string;
    configId: string;
    endpoint: string;
    userId: string;
    requirements: any;
  };
  onScan?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function SelfQRCode({ 
  sessionData, 
  onScan, 
  onError, 
  className = '' 
}: SelfQRCodeProps) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanned, setIsScanned] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, [sessionData]);

  const generateQRCode = async () => {
    try {
      setIsLoading(true);
      
      // Format data for Self.xyz mobile app
      const qrData = {
        type: 'self-verification',
        scope: sessionData.scope,
        configId: sessionData.configId,
        endpoint: sessionData.endpoint,
        userId: sessionData.userId,
        requirements: sessionData.requirements,
        timestamp: Date.now(),
        version: '1.0'
      };

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeDataURL(qrCodeDataURL);
      setIsLoading(false);
    } catch (error) {
      console.error('QR code generation failed:', error);
      onError?.(error instanceof Error ? error.message : 'QR code generation failed');
      setIsLoading(false);
    }
  };

  const handleScan = () => {
    setIsScanned(true);
    onScan?.();
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center w-80 h-80 bg-white/5 rounded-xl border border-white/10 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-white mb-4" />
        <p className="text-white/70 text-sm">Generating QR Code...</p>
      </div>
    );
  }

  if (isScanned) {
    return (
      <div className={`flex flex-col items-center justify-center w-80 h-80 bg-green-500/10 rounded-xl border border-green-500/20 ${className}`}>
        <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
        <h3 className="text-lg font-semibold text-green-400 mb-2">QR Code Scanned</h3>
        <p className="text-green-300/70 text-sm text-center">
          Please complete verification in the Self.xyz mobile app
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-6 ${className}`}>
      {/* QR Code Display */}
      <div className="relative">
        <div className="w-64 h-64 bg-white rounded-xl p-4 shadow-2xl">
          <img 
            src={qrCodeDataURL} 
            alt="Self.xyz QR Code" 
            className="w-full h-full"
            onClick={handleScan}
          />
        </div>
        
        {/* Scan overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 hover:opacity-100 transition-opacity cursor-pointer" onClick={handleScan}>
          <div className="text-center text-white">
            <Smartphone className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">Click to simulate scan</p>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-white" />
          <h3 className="text-lg font-semibold text-white">Scan with Self.xyz App</h3>
        </div>
        
        <p className="text-sm text-white/70 max-w-sm">
          Use the Self.xyz mobile app to scan this QR code and complete your identity verification.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-xs text-white/50">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span>Waiting for scan...</span>
        </div>
      </div>

      {/* Session Info */}
      <div className="w-full p-3 bg-white/5 rounded-lg border border-white/10">
        <div className="text-xs text-white/50 space-y-1">
          <div>Session: {sessionData.scope}</div>
          <div>Config: {sessionData.configId}</div>
          <div>User: {sessionData.userId.slice(0, 8)}...{sessionData.userId.slice(-8)}</div>
        </div>
      </div>
    </div>
  );
}
