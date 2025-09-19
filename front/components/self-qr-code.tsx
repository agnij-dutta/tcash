'use client';

import React, { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { Loader2, Smartphone, Shield, CheckCircle, RefreshCw, AlertCircle, Clock, QrCode } from 'lucide-react';

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
  onStatusUpdate?: (status: 'waiting' | 'scanned' | 'processing' | 'completed' | 'error') => void;
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function SelfQRCode({ 
  sessionData, 
  onScan, 
  onError, 
  onStatusUpdate,
  className = '',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: SelfQRCodeProps) {
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<'waiting' | 'scanned' | 'processing' | 'completed' | 'error'>('waiting');
  const [error, setError] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutes
  const [retryCount, setRetryCount] = useState(0);

  // Update status and notify parent
  const updateStatus = useCallback((newStatus: typeof status) => {
    setStatus(newStatus);
    onStatusUpdate?.(newStatus);
  }, [onStatusUpdate]);

  // Generate QR code with enhanced data
  const generateQRCode = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Enhanced QR data for Self.xyz mobile app
      const qrData = {
        type: 'self-verification',
        version: '2.0', // Updated version
        scope: sessionData.scope,
        configId: sessionData.configId,
        endpoint: sessionData.endpoint,
        userId: sessionData.userId,
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        requirements: {
          minimumAge: 18,
          requireOfacCheck: true,
          allowedDocumentTypes: [1, 2], // E-Passport, EU ID Card
          ...sessionData.requirements
        },
        metadata: {
          appName: 'T-Cash',
          appVersion: '1.0.0',
          timestamp: Date.now(),
          expiresAt: Date.now() + 300000, // 5 minutes
          chainId: 44787, // Celo Alfajores
          locale: 'en'
        },
        security: {
          nonce: Math.random().toString(36).substr(2, 16),
          challenge: `challenge_${Date.now()}`
        }
      };

      // Generate QR code with enhanced styling
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 280,
        margin: 3,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });

      setQrCodeDataURL(qrCodeDataURL);
      updateStatus('waiting');
      setTimeRemaining(300); // Reset timer
      setIsLoading(false);
    } catch (error) {
      console.error('QR code generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'QR code generation failed';
      setError(errorMessage);
      updateStatus('error');
      onError?.(errorMessage);
      setIsLoading(false);
    }
  }, [sessionData, updateStatus, onError]);

  // Handle scan simulation
  const handleScan = useCallback(() => {
    if (status === 'waiting') {
      updateStatus('scanned');
      onScan?.();
      
      // Simulate processing
      setTimeout(() => {
        updateStatus('processing');
      }, 1000);
    }
  }, [status, updateStatus, onScan]);

  // Countdown timer
  useEffect(() => {
    if (status === 'waiting' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            updateStatus('error');
            setError('QR code expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, timeRemaining, updateStatus]);

  // Auto-refresh QR code
  useEffect(() => {
    if (autoRefresh && status === 'error' && retryCount < 3) {
      const retryTimer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        generateQRCode();
      }, 5000);

      return () => clearTimeout(retryTimer);
    }
  }, [autoRefresh, status, retryCount, generateQRCode]);

  // Initial generation
  useEffect(() => {
    generateQRCode();
  }, [sessionData]);

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center w-80 h-96 bg-white/5 rounded-xl border border-white/10 ${className}`}>
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <QrCode className="w-6 h-6 text-white/40 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-white/70 text-sm mt-4">Generating QR Code...</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span>Preparing verification session</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (status === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center w-80 h-96 bg-red-500/10 rounded-xl border border-red-500/20 ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-red-400 mb-2">QR Code Error</h3>
        <p className="text-red-300/70 text-sm text-center mb-4 max-w-64">
          {error || 'Failed to generate QR code'}
        </p>
        <button
          onClick={() => {
            setRetryCount(0);
            generateQRCode();
          }}
          className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Try Again
        </button>
        {retryCount > 0 && (
          <p className="text-xs text-red-400/60 mt-2">
            Retry {retryCount} of 3
          </p>
        )}
      </div>
    );
  }

  // Render scanned/processing state
  if (status === 'scanned' || status === 'processing') {
    return (
      <div className={`flex flex-col items-center justify-center w-80 h-96 bg-blue-500/10 rounded-xl border border-blue-500/20 ${className}`}>
        <div className="relative mb-4">
          {status === 'scanned' ? (
            <CheckCircle className="w-16 h-16 text-blue-400" />
          ) : (
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-blue-400" />
              <Shield className="w-8 h-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          )}
        </div>
        <h3 className="text-lg font-semibold text-blue-400 mb-2">
          {status === 'scanned' ? 'QR Code Scanned!' : 'Processing Verification'}
        </h3>
        <p className="text-blue-300/70 text-sm text-center max-w-64">
          {status === 'scanned' 
            ? 'Please complete verification in the Self.xyz mobile app'
            : 'Verifying your identity with Self.xyz...'
          }
        </p>
        <div className="flex items-center gap-2 mt-4 text-xs text-blue-400/60">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span>
            {status === 'scanned' ? 'Waiting for app verification' : 'Processing identity proof'}
          </span>
        </div>
      </div>
    );
  }

  // Render completed state
  if (status === 'completed') {
    return (
      <div className={`flex flex-col items-center justify-center w-80 h-96 bg-green-500/10 rounded-xl border border-green-500/20 ${className}`}>
        <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
        <h3 className="text-lg font-semibold text-green-400 mb-2">Verification Complete!</h3>
        <p className="text-green-300/70 text-sm text-center max-w-64">
          Your identity has been successfully verified with Self.xyz
        </p>
      </div>
    );
  }

  // Render main QR code display (waiting state)
  return (
    <div className={`flex flex-col items-center space-y-6 ${className}`}>
      {/* QR Code Display with enhanced styling */}
      <div className="relative group">
        <div className="w-72 h-72 bg-white rounded-2xl p-4 shadow-2xl border border-gray-200 relative overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-30"></div>
          
          {/* QR Code */}
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <img 
              src={qrCodeDataURL} 
              alt="Self.xyz Verification QR Code" 
              className="w-full h-full object-contain transition-transform group-hover:scale-105"
              onClick={handleScan}
            />
          </div>
          
          {/* Scan overlay with animation */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-20" onClick={handleScan}>
            <div className="text-center text-white">
              <Smartphone className="w-10 h-10 mx-auto mb-3 animate-bounce" />
              <p className="text-sm font-medium">Click to simulate scan</p>
            </div>
          </div>
          
          {/* Timer indicator */}
          <div className="absolute top-3 right-3 z-30">
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
              <Clock className="w-3 h-3 text-gray-600" />
              <span className={timeRemaining < 60 ? 'text-red-600' : 'text-gray-600'}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Corner decorations */}
        <div className="absolute -top-2 -left-2 w-6 h-6 border-l-4 border-t-4 border-blue-500 rounded-tl-lg"></div>
        <div className="absolute -top-2 -right-2 w-6 h-6 border-r-4 border-t-4 border-blue-500 rounded-tr-lg"></div>
        <div className="absolute -bottom-2 -left-2 w-6 h-6 border-l-4 border-b-4 border-blue-500 rounded-bl-lg"></div>
        <div className="absolute -bottom-2 -right-2 w-6 h-6 border-r-4 border-b-4 border-blue-500 rounded-br-lg"></div>
      </div>
      
      {/* Instructions */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Scan with Self.xyz App</h3>
        </div>
        
        <p className="text-sm text-white/70 max-w-sm leading-relaxed">
          Open the Self.xyz mobile app and scan this QR code to complete your secure identity verification.
        </p>
        
        {/* Status indicators */}
        <div className="flex items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-white/50">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>Waiting for scan...</span>
          </div>
          <div className="w-1 h-4 bg-white/20 rounded-full"></div>
          <div className="flex items-center gap-2 text-white/50">
            <QrCode className="w-3 h-3" />
            <span>Valid for {formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Session Info Panel */}
      <div className="w-full max-w-sm p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
        <h4 className="text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Verification Details
        </h4>
        <div className="space-y-2 text-xs text-white/60">
          <div className="flex justify-between">
            <span>Scope:</span>
            <span className="font-mono text-white/80">{sessionData.scope}</span>
          </div>
          <div className="flex justify-between">
            <span>Config ID:</span>
            <span className="font-mono text-white/80">{sessionData.configId}</span>
          </div>
          <div className="flex justify-between">
            <span>User:</span>
            <span className="font-mono text-white/80">
              {sessionData.userId.slice(0, 6)}...{sessionData.userId.slice(-6)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Requirements:</span>
            <span className="text-white/80">
              {sessionData.requirements?.minimumAge || 18}+ age, OFAC check
            </span>
          </div>
        </div>
        
        {/* Refresh button */}
        <button
          onClick={generateQRCode}
          className="w-full mt-3 px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-xs text-white/70 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh QR Code
        </button>
      </div>
    </div>
  );
}
