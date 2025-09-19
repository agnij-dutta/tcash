// SPDX-License-Identifier: MIT
import { SelfProof, IdentityData } from '../types/contracts';
import QRCode from 'qrcode';

export class SelfIntegration {
  /**
   * Generate a Self.xyz proof (mock implementation)
   * In a real implementation, this would integrate with Self.xyz mobile app
   */
  static async generateProof(identityData: IdentityData): Promise<SelfProof> {
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // In a real implementation, this would:
    // 1. Generate QR code for Self.xyz mobile app
    // 2. Handle mobile app interaction
    // 3. Process verification results
    // 4. Return actual proof data

    return {
      nullifier: '0x' + this.generateRandomHex(32),
      userIdentifier: '0x' + this.generateRandomHex(32),
      nationality: 'US',
      documentType: 1, // E-Passport
      ageAtLeast: 25,
      isOfacMatch: false,
      attestationId: '0x' + this.generateRandomHex(32),
      proof: '0x' + this.generateRandomHex(64),
      timestamp: Date.now()
    };
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
   * Create verification session with QR code
   */
  static async createVerificationSession(identityData: IdentityData): Promise<{
    sessionId: string;
    qrCode: string;
    qrCodeData: string;
    expiresAt: Date;
  }> {
    const sessionId = 'session_' + this.generateRandomHex(16);
    const qrData = this.generateQRCode(identityData.configId, identityData.scope);
    const qrCode = await this.generateQRCode(identityData.configId, identityData.scope, {
      sessionId,
      userId: identityData.userId
    });

    return {
      sessionId,
      qrCode,
      qrCodeData: qrData,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };
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
