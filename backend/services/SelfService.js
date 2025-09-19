const { getSelfConfig } = require('../config/self');
const { getCeloConfig } = require('../config/celo');
const CeloService = require('./CeloService');

class SelfService {
  constructor() {
    this.selfConfig = getSelfConfig();
    this.celoConfig = getCeloConfig();
    this.celoService = new CeloService();
  }

  /**
   * Initialize an onchain KYC verification session
   * @param {string} userId - User ID from your system
   * @param {string} walletAddress - User's Celo wallet address
   * @param {Object} additionalRequirements - Additional KYC requirements
   * @returns {Object} Session data for frontend QR code generation
   */
  async initiateOnchainKYC(userId, walletAddress, additionalRequirements = {}) {
    try {
      console.log(`🚀 Initiating onchain KYC for user ${userId} with wallet ${walletAddress}`);

      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!walletAddress || !this.isValidAddress(walletAddress)) {
        throw new Error('Valid wallet address is required');
      }

      // Check if user is already verified
      const existingVerification = await this.celoService.getKYCStatus(walletAddress);
      if (existingVerification && existingVerification.isVerified) {
        return {
          success: false,
          error: 'User already verified',
          details: {
            verifiedAt: existingVerification.timestamp,
            nationality: existingVerification.nationality,
          },
        };
      }

      // Create verification session with enhanced QR code data
      const sessionData = this.selfConfig.createVerificationSession(
        userId,
        walletAddress,
        additionalRequirements
      );

      // Generate session metadata
      const session = {
        sessionId: this.generateSessionId(),
        userId,
        walletAddress,
        status: 'pending',
        requirements: sessionData.requirements,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };

      console.log(`✅ KYC session created: ${session.sessionId}`);

      return {
        success: true,
        sessionData: {
          // Enhanced data for Self QR code generation
          scope: sessionData.scope,
          configId: sessionData.configId,
          endpoint: sessionData.endpoint,
          userId: walletAddress, // Use wallet address as userId for Self
          requirements: sessionData.requirements,
          sessionId: session.sessionId,
          // Additional QR code metadata
          qrCodeType: 'self-verification',
          version: '1.0',
          timestamp: Date.now(),
          // Callback URLs
          successUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/kyc/success`,
          errorUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/kyc/error`,
        },
        session,
      };

    } catch (error) {
      console.error('❌ Self KYC initiation error:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }

  /**
   * Process Self verification callback/webhook
   * @param {Object} verificationData - Proof data from Self
   * @param {string} signature - Webhook signature for verification
   * @returns {Object} Processing result
   */
  async processVerification(verificationData, signature) {
    try {
      console.log('🔄 Processing Self verification result');

      // Verify webhook signature if secret is configured
      if (this.selfConfig.webhookSecret) {
        const isValidSignature = this.selfConfig.verifyWebhookSignature(
          JSON.stringify(verificationData),
          signature
        );

        if (!isValidSignature) {
          console.error('❌ Invalid webhook signature');
          return {
            success: false,
            error: 'Invalid webhook signature',
            details: 'Webhook signature verification failed',
          };
        }
      }

      // Process verification using Self config
      const result = await this.selfConfig.processVerificationResult(verificationData);

      if (!result.success) {
        console.error('❌ Self verification processing failed:', result.error);
        return {
          success: false,
          error: result.error,
          details: result.details,
        };
      }

      const { verificationData: validatedData } = result;

      // Submit to blockchain
      const onchainResult = await this.submitToBlockchain(
        validatedData,
        verificationData.userWalletAddress || verificationData.userId
      );

      if (!onchainResult.success) {
        console.error('❌ Blockchain submission failed:', onchainResult.error);
        return {
          success: false,
          error: 'Blockchain submission failed',
          details: onchainResult.error,
        };
      }

      console.log('✅ Self verification processed successfully');

      return {
        success: true,
        user: {
          walletAddress: verificationData.userWalletAddress || verificationData.userId,
          transactionHash: onchainResult.transactionHash,
        },
        verificationResult: validatedData,
        onchainResult: onchainResult,
      };

    } catch (error) {
      console.error('❌ Self verification processing error:', error);
      return {
        success: false,
        error: 'Verification processing failed',
        details: error.message,
      };
    }
  }

  /**
   * Submit verification to Celo blockchain
   * @param {Object} verificationData - Validated verification data
   * @param {string} walletAddress - User's wallet address
   * @returns {Object} Blockchain submission result
   */
  async submitToBlockchain(verificationData, walletAddress) {
    try {
      console.log(`🔗 Submitting verification to blockchain for ${walletAddress}`);

      const result = await this.celoService.submitKYCVerification(
        walletAddress,
        verificationData.nullifier,
        verificationData.userIdentifier,
        verificationData.nationality,
        verificationData.documentType,
        verificationData.ageAtLeast,
        verificationData.isOfacMatch
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      console.log(`✅ Blockchain submission successful: ${result.transactionHash}`);

      return {
        success: true,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
      };

    } catch (error) {
      console.error('❌ Blockchain submission error:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }

  /**
   * Validate verification requirements
   * @param {Object} requirements - Requirements to validate
   * @returns {Object} Validation result
   */
  validateRequirements(requirements) {
    try {
      const errors = [];
      const supportedConfig = this.selfConfig.getConfiguration();

      // Validate minimum age
      if (requirements.minimumAge !== undefined) {
        if (typeof requirements.minimumAge !== 'number' || requirements.minimumAge < 0 || requirements.minimumAge > 120) {
          errors.push('Invalid minimum age');
        }
      }

      // Validate document types
      if (requirements.allowedDocumentTypes) {
        if (!Array.isArray(requirements.allowedDocumentTypes)) {
          errors.push('Document types must be an array');
        } else {
          const validTypes = [1, 2, 3]; // E-Passport, EU ID Card, Aadhaar
          const invalidTypes = requirements.allowedDocumentTypes.filter(type => !validTypes.includes(type));
          if (invalidTypes.length > 0) {
            errors.push(`Invalid document types: ${invalidTypes.join(', ')}`);
          }
        }
      }

      // Validate excluded countries
      if (requirements.excludedCountries) {
        if (!Array.isArray(requirements.excludedCountries)) {
          errors.push('Excluded countries must be an array');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        supportedConfig,
      };

    } catch (error) {
      console.error('❌ Requirements validation error:', error);
      return {
        isValid: false,
        errors: ['Validation error'],
        supportedConfig: this.selfConfig.getConfiguration(),
      };
    }
  }

  /**
   * Get KYC status for a user
   * @param {string} walletAddress - User's wallet address
   * @returns {Object} KYC status
   */
  async getKYCStatus(walletAddress) {
    try {
      return await this.celoService.getKYCStatus(walletAddress);
    } catch (error) {
      console.error('❌ Get KYC status error:', error);
      return {
        isVerified: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate session ID
   * @returns {string} Unique session ID
   */
  generateSessionId() {
    return 'self_kyc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Validate wallet address
   * @param {string} address - Address to validate
   * @returns {boolean} Is valid address
   */
  isValidAddress(address) {
    try {
      // Basic Ethereum address validation
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service configuration
   * @returns {Object} Service configuration
   */
  getConfiguration() {
    return {
      self: this.selfConfig.getConfiguration(),
      celo: this.celoConfig.getConfiguration(),
    };
  }
}

module.exports = SelfService;
