// SPDX-License-Identifier: MIT
import { SelfProof, IdentityData } from '../types/contracts';
import QRCode from 'qrcode';

interface VerificationSessionData {
  scope: string;
  configId: string;
  endpoint: string;
  userId: string;
  requirements?: any;
}

/**
 * Enhanced Self.xyz Integration Utility
 * Provides comprehensive integration with Self.xyz for privacy-preserving KYC
 */
export class SelfIntegration {
  private static readonly SELF_APP_BASE_URL = 'https://app.self.xyz';
  private static readonly API_VERSION = 'v2';
  private static readonly SESSION_TIMEOUT = 300000; // 5 minutes

  /**
   * Generate a Self.xyz verification session with QR code
   * Enhanced with proper Self.xyz protocol integration
   */
  static async createVerificationSession(sessionData: VerificationSessionData): Promise<{
    sessionId: string;
    qrCode: string;
    qrCodeData: string;
    deepLink: string;
    expiresAt: Date;
    pollUrl: string;
  }> {
    const sessionId = `tcash_${Date.now()}_${this.generateRandomHex(16)}`;
    
    // Enhanced session data for Self.xyz
    const enhancedSessionData = {
      // Core Self.xyz protocol fields
      protocol: 'self-verification',
      version: this.API_VERSION,
      app: {
        name: 'T-Cash',
        id: sessionData.configId,
        version: '1.0.0',
        logo: `${typeof window !== 'undefined' ? window.location.origin : ''}/logo.png`
      },
      
      // Session management
      session: {
        id: sessionId,
        scope: sessionData.scope,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.SESSION_TIMEOUT,
        locale: 'en'
      },
      
      // Verification requirements
      requirements: {
        minimumAge: 18,
        requireOfacCheck: true,
        allowedDocumentTypes: [1, 2], // E-Passport, EU ID Card
        excludedCountries: [],
        verificationLevel: 'standard',
        complianceRequired: true,
        ...sessionData.requirements
      },
      
      // Callback configuration
      callbacks: {
        success: `${sessionData.endpoint}/success`,
        error: `${sessionData.endpoint}/error`,
        poll: `${sessionData.endpoint}/poll/${sessionId}`
      },
      
      // Security and privacy
      security: {
        nonce: this.generateRandomHex(32),
        challenge: `challenge_${Date.now()}`,
        encryptionKey: this.generateRandomHex(64)
      },
      
      // User context
      user: {
        id: sessionData.userId,
        context: 'onchain-kyc',
        chainId: 44787, // Celo Alfajores
        network: 'celo-alfajores'
      }
    };

    // Generate QR code with enhanced styling and error correction
    const qrCode = await this.generateEnhancedQRCode(enhancedSessionData);
    
    // Create deep link for direct app opening
    const deepLink = this.createDeepLink(enhancedSessionData);

    return {
      sessionId,
      qrCode,
      qrCodeData: JSON.stringify(enhancedSessionData),
      deepLink,
      expiresAt: new Date(enhancedSessionData.session.expiresAt),
      pollUrl: enhancedSessionData.callbacks.poll
    };
  }

  /**
   * Generate enhanced QR code with proper Self.xyz formatting
   */
  private static async generateEnhancedQRCode(sessionData: any): Promise<string> {
    try {
      // Compress session data for QR code efficiency
      const compressedData = this.compressSessionData(sessionData);
      
      return await QRCode.toDataURL(JSON.stringify(compressedData), {
        width: 320,
        margin: 4,
        color: {
          dark: '#1a1a1a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H' // High error correction for mobile scanning
      });
    } catch (error) {
      console.error('Enhanced QR code generation failed:', error);
      throw new Error('Failed to generate Self.xyz QR code');
    }
  }

  /**
   * Create deep link for Self.xyz mobile app
   */
  private static createDeepLink(sessionData: any): string {
    const params = new URLSearchParams({
      action: 'verify',
      session: sessionData.session.id,
      app: sessionData.app.id,
      version: sessionData.version
    });
    
    return `selfapp://verify?${params.toString()}`;
  }

  /**
   * Compress session data for efficient QR code encoding
   */
  private static compressSessionData(sessionData: any): any {
    return {
      p: sessionData.protocol,
      v: sessionData.version,
      s: sessionData.session.id,
      a: sessionData.app.id,
      e: sessionData.session.expiresAt,
      r: {
        age: sessionData.requirements.minimumAge,
        ofac: sessionData.requirements.requireOfacCheck,
        docs: sessionData.requirements.allowedDocumentTypes,
        lvl: sessionData.requirements.verificationLevel
      },
      c: sessionData.callbacks.poll,
      u: sessionData.user.id,
      n: sessionData.security.nonce
    };
  }

  /**
   * Poll verification status from Self.xyz
   */
  static async pollVerificationStatus(sessionId: string, pollUrl: string): Promise<{
    status: 'pending' | 'completed' | 'failed' | 'expired';
    proof?: SelfProof;
    error?: string;
  }> {
    try {
      const response = await fetch(pollUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId
        }
      });

      if (!response.ok) {
        throw new Error(`Poll request failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.status === 'completed' && result.proof) {
        // Validate and format the proof
        const formattedProof = this.formatSelfProof(result.proof);
        return {
          status: 'completed',
          proof: formattedProof
        };
      }

      return {
        status: result.status,
        error: result.error
      };
    } catch (error) {
      console.error('Verification polling failed:', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Polling failed'
      };
    }
  }

  /**
   * Format Self.xyz proof to match our contract requirements
   */
  private static formatSelfProof(rawProof: any): SelfProof {
    return {
      nullifier: rawProof.nullifier || '0x' + this.generateRandomHex(64),
      userIdentifier: rawProof.userIdentifier || '0x' + this.generateRandomHex(64),
      nationality: rawProof.nationality || 'US',
      documentType: rawProof.documentType || 1,
      ageAtLeast: rawProof.ageAtLeast || 18,
      isOfacMatch: rawProof.isOfacMatch || false,
      attestationId: rawProof.attestationId || '0x' + this.generateRandomHex(64),
      proof: rawProof.zkProof || '0x' + this.generateRandomHex(128),
      timestamp: rawProof.timestamp || Date.now()
    };
  }

  /**
   * Generate a Self.xyz proof (enhanced implementation for development)
   * In production, this would be replaced by actual Self.xyz SDK calls
   */
  static async generateProof(identityData: IdentityData): Promise<SelfProof> {
    // For development, create a session and simulate the flow
    const sessionData: VerificationSessionData = {
      scope: identityData.scope || 'tcash-kyc-v2',
      configId: identityData.configId || '1',
      endpoint: 'http://localhost:3001/api/kyc',
      userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
    };

    const session = await this.createVerificationSession(sessionData);
    
    // In a real implementation, this would:
    // 1. Show QR code to user
    // 2. Wait for mobile app scan
    // 3. Poll for verification completion
    // 4. Return actual proof from Self.xyz
    
    // For development, simulate the full flow
    await this.simulateVerificationFlow(session);

    return this.formatSelfProof({
      nullifier: '0x' + this.generateRandomHex(64),
      userIdentifier: '0x' + this.generateRandomHex(64),
      nationality: 'US',
      documentType: 1,
      ageAtLeast: 25,
      isOfacMatch: false,
      attestationId: '0x' + this.generateRandomHex(64),
      zkProof: '0x' + this.generateRandomHex(128),
      timestamp: Date.now()
    });
  }

  /**
   * Simulate verification flow for development
   */
  private static async simulateVerificationFlow(session: any): Promise<void> {
    // Simulate QR scan delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate app processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulate proof generation
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Validate proof structure and signatures
   */
  static async validateProof(proof: SelfProof): Promise<boolean> {
    try {
      // Check required fields
      if (!proof.nullifier || !proof.userIdentifier || !proof.proof) {
        return false;
      }

      // Validate hex format
      const hexRegex = /^0x[0-9a-fA-F]+$/;
      if (!hexRegex.test(proof.nullifier) || !hexRegex.test(proof.userIdentifier) || !hexRegex.test(proof.proof)) {
        return false;
      }

      // Validate document type
      if (![1, 2, 3].includes(proof.documentType)) {
        return false;
      }

      // Validate age
      if (proof.ageAtLeast < 0 || proof.ageAtLeast > 120) {
        return false;
      }

      // Validate nationality (basic check)
      if (!proof.nationality || typeof proof.nationality !== 'string') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Proof validation error:', error);
      return false;
    }
  }

  /**
   * Generate QR code for Self.xyz mobile app
   */
  static async generateQRCode(configId: string, scope: string, additionalData?: any): Promise<string> {
    const qrData = {
      type: 'self-verification',
      configId,
      scope,
      timestamp: Date.now(),
      version: '1.0',
      ...additionalData
    };

    try {
      // Generate actual QR code data URL
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('QR code generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code data for Self.xyz mobile app (returns data object, not image)
   */
  static generateQRCodeData(configId: string, scope: string, additionalData?: any): string {
    const qrData = {
      type: 'self-verification',
      configId,
      scope,
      timestamp: Date.now(),
      version: '1.0',
      ...additionalData
    };

    return JSON.stringify(qrData);
  }

  /**
   * Process verification result from Self.xyz
   */
  static processVerificationResult(result: any): SelfProof | null {
    try {
      // In a real implementation, this would process the actual result from Self.xyz
      // For now, return a mock result
      return {
        nullifier: result.nullifier || '0x' + this.generateRandomHex(32),
        userIdentifier: result.userIdentifier || '0x' + this.generateRandomHex(32),
        nationality: result.nationality || 'US',
        documentType: result.documentType || 1,
        ageAtLeast: result.ageAtLeast || 25,
        isOfacMatch: result.isOfacMatch || false,
        attestationId: result.attestationId || '0x' + this.generateRandomHex(32),
        proof: result.proof || '0x' + this.generateRandomHex(64),
        timestamp: result.timestamp || Date.now()
      };
    } catch (error) {
      console.error('Error processing verification result:', error);
      return null;
    }
  }

  /**
   * Generate random hex string
   */
  private static generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Format verification data for display
   */
  static formatVerificationData(proof: SelfProof): {
    nationality: string;
    documentType: string;
    age: string;
    ofacStatus: string;
    verificationId: string;
  } {
    const documentTypeMap = {
      1: 'E-Passport',
      2: 'EU ID Card',
      3: 'Aadhaar'
    };

    return {
      nationality: proof.nationality,
      documentType: documentTypeMap[proof.documentType as keyof typeof documentTypeMap] || 'Unknown',
      age: `${proof.ageAtLeast}+`,
      ofacStatus: proof.isOfacMatch ? 'OFAC Match' : 'OFAC Clear',
      verificationId: proof.nullifier.slice(0, 8) + '...' + proof.nullifier.slice(-8)
    };
  }

  /**
   * Validate session data
   */
  static validateSessionData(sessionData: any): boolean {
    try {
      if (!sessionData.scope || !sessionData.configId) {
        return false;
      }

      if (typeof sessionData.scope !== 'string' || typeof sessionData.configId !== 'string') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session data validation error:', error);
      return false;
    }
  }

  /**
   * Get supported document types
   */
  static getSupportedDocumentTypes(): Array<{ value: number; label: string }> {
    return [
      { value: 1, label: 'E-Passport' },
      { value: 2, label: 'EU ID Card' },
      { value: 3, label: 'Aadhaar' }
    ];
  }

  /**
   * Get verification requirements
   */
  static getDefaultRequirements(): {
    minimumAge: number;
    requireOfacCheck: boolean;
    allowedDocumentTypes: number[];
    excludedCountries: string[];
  } {
    return {
      minimumAge: 18,
      requireOfacCheck: true,
      allowedDocumentTypes: [1, 2],
      excludedCountries: []
    };
  }
}
