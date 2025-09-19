// SPDX-License-Identifier: MIT
import { ethers } from 'ethers';

// Enhanced ComplianceOracle ABI with Self.xyz integration
export const ENHANCED_COMPLIANCE_ORACLE_ABI = [
  // View functions
  "function isExitAllowed(address token, uint256 amountUsd1e18) external view returns (bool)",
  "function getUserMaxAmount(address user) external view returns (uint256)",
  "function isUserKYCCompliant(address user) external view returns (bool)",
  "function getSelfKYCVerifier() external view returns (address)",
  "function tokenUsdThreshold(address token) external view returns (uint256)",
  "function kycValidityPeriod() external view returns (uint256)",
  "function requireKYCForAll() external view returns (bool)",
  "function documentTypeMaxAmount(uint8 documentType) external view returns (uint256)",
  "function ageMultipliers(uint256 ageThreshold) external view returns (uint256)",
  "function owner() external view returns (address)",
  
  // Write functions
  "function setThreshold(address token, uint256 usdThreshold1e18) external",
  "function setSelfKYCVerifier(address _selfKYCVerifier) external",
  "function updateKYCConfig(uint256 _validityPeriod, bool _requireKYCForAll) external",
  "function setDocumentTypeLimit(uint8 documentType, uint256 maxAmount) external",
  "function setAgeMultiplier(uint256 ageThreshold, uint256 multiplier) external",
  
  // Events
  "event SelfKYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier)",
  "event KYCConfigUpdated(uint256 validityPeriod, bool requireKYCForAll)",
  "event DocumentTypeLimitSet(uint8 indexed documentType, uint256 maxAmount)",
  "event AgeMultiplierSet(uint256 indexed ageThreshold, uint256 multiplier)"
];

// SelfKYCVerifier ABI for reading KYC data
export const SELF_KYC_VERIFIER_ABI = [
  "function isKYCVerified(address user) external view returns (bool)",
  "function getKYCData(address user) external view returns (tuple(bool isVerified, uint256 timestamp, string nationality, uint8 documentType, bool isOfacClear, uint256 verificationCount))",
  "function getUserFromNullifier(uint256 nullifier) external view returns (address)",
  "function isNullifierUsed(uint256 nullifier) external view returns (bool)",
  "function getStatistics() external view returns (uint256, uint256)",
  
  // Events
  "event KYCVerified(address indexed user, uint256 indexed nullifier, string nationality, uint8 documentType, uint256 timestamp, bool isOfacClear)"
];

// Contract addresses from deployment
export const CONTRACT_ADDRESSES = {
  // Celo Alfajores testnet
  44787: {
    selfKYCVerifier: '0x31fE360492189a0c03BACaE36ef9be682Ad3727B',
    complianceOracle: '0x0000000000000000000000000000000000000000', // Update after deployment
    shieldedVault: '0x0000000000000000000000000000000000000000',     // Update after deployment
  },
  // Celo Mainnet
  42220: {
    selfKYCVerifier: '0x0000000000000000000000000000000000000000',
    complianceOracle: '0x0000000000000000000000000000000000000000',
    shieldedVault: '0x0000000000000000000000000000000000000000',
  }
};

export interface KYCData {
  isVerified: boolean;
  timestamp: bigint;
  nationality: string;
  documentType: number;
  isOfacClear: boolean;
  verificationCount: bigint;
}

export interface ComplianceStatus {
  isKYCCompliant: boolean;
  maxAllowedAmount: bigint;
  kycData?: KYCData;
  canExit: boolean;
  restrictions?: string[];
}

/**
 * Enhanced Compliance Oracle with Self.xyz Integration
 * Provides methods to interact with the integrated compliance system
 */
export class EnhancedComplianceOracle {
  private complianceContract: ethers.Contract;
  private selfKYCContract: ethers.Contract;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(
    provider: ethers.Provider,
    chainId: number,
    signer?: ethers.Signer
  ) {
    this.provider = provider;
    this.signer = signer;
    
    const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
    if (!addresses) {
      throw new Error(`Contracts not deployed on chain ${chainId}`);
    }
    
    // Initialize compliance oracle contract
    if (!addresses.complianceOracle || addresses.complianceOracle === '0x0000000000000000000000000000000000000000') {
      throw new Error(`ComplianceOracle not deployed on chain ${chainId}`);
    }
    
    this.complianceContract = new ethers.Contract(
      addresses.complianceOracle,
      ENHANCED_COMPLIANCE_ORACLE_ABI,
      signer || provider
    );
    
    // Initialize SelfKYCVerifier contract
    this.selfKYCContract = new ethers.Contract(
      addresses.selfKYCVerifier,
      SELF_KYC_VERIFIER_ABI,
      provider
    );
  }

  /**
   * Get comprehensive compliance status for a user
   */
  async getComplianceStatus(userAddress: string): Promise<ComplianceStatus> {
    try {
      const [isKYCCompliant, maxAllowedAmount, kycData] = await Promise.all([
        this.complianceContract.isUserKYCCompliant(userAddress),
        this.complianceContract.getUserMaxAmount(userAddress),
        this.selfKYCContract.getKYCData(userAddress)
      ]);

      const restrictions: string[] = [];
      
      if (!kycData.isVerified) {
        restrictions.push('KYC verification required');
      }
      
      if (!kycData.isOfacClear) {
        restrictions.push('OFAC restriction detected');
      }
      
      // Check if KYC has expired
      const validityPeriod = await this.complianceContract.kycValidityPeriod();
      const isExpired = BigInt(Date.now()) / 1000n > kycData.timestamp + validityPeriod;
      if (isExpired) {
        restrictions.push('KYC verification expired');
      }

      return {
        isKYCCompliant,
        maxAllowedAmount,
        kycData: {
          isVerified: kycData.isVerified,
          timestamp: kycData.timestamp,
          nationality: kycData.nationality,
          documentType: Number(kycData.documentType),
          isOfacClear: kycData.isOfacClear,
          verificationCount: kycData.verificationCount
        },
        canExit: isKYCCompliant && maxAllowedAmount > 0n,
        restrictions: restrictions.length > 0 ? restrictions : undefined
      };
    } catch (error: any) {
      console.error('Failed to get compliance status:', error);
      throw new Error(`Failed to get compliance status: ${error.message}`);
    }
  }

  /**
   * Check if a specific exit amount is allowed
   */
  async checkExitAllowed(
    tokenAddress: string,
    amountUsd: bigint
  ): Promise<{
    allowed: boolean;
    reason?: string;
    maxAllowed?: bigint;
  }> {
    try {
      const [allowed, maxAllowed] = await Promise.all([
        this.complianceContract.isExitAllowed(tokenAddress, amountUsd),
        this.complianceContract.getUserMaxAmount(ethers.ZeroAddress) // Pass zero address to get current user
      ]);

      return {
        allowed,
        maxAllowed,
        reason: allowed ? undefined : `Exit not allowed. Maximum: ${ethers.formatEther(maxAllowed)} USD`
      };
    } catch (error: any) {
      console.error('Failed to check exit allowance:', error);
      return {
        allowed: false,
        reason: `Check failed: ${error.message}`
      };
    }
  }

  /**
   * Listen to KYC verification events from Self.xyz
   */
  onKYCVerified(
    callback: (eventData: {
      user: string;
      nullifier: string;
      nationality: string;
      documentType: number;
      timestamp: bigint;
      isOfacClear: boolean;
    }) => void
  ): void {
    this.selfKYCContract.on('KYCVerified', (
      user,
      nullifier,
      nationality,
      documentType,
      timestamp,
      isOfacClear
    ) => {
      callback({
        user,
        nullifier: nullifier.toString(),
        nationality,
        documentType: Number(documentType),
        timestamp,
        isOfacClear
      });
    });
  }

  /**
   * Listen to compliance configuration updates
   */
  onComplianceConfigUpdated(
    callback: (eventData: {
      validityPeriod: bigint;
      requireKYCForAll: boolean;
    }) => void
  ): void {
    this.complianceContract.on('KYCConfigUpdated', (validityPeriod, requireKYCForAll) => {
      callback({ validityPeriod, requireKYCForAll });
    });
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<{
    totalVerifications: bigint;
    uniqueUsers: bigint;
    kycValidityPeriod: bigint;
    requireKYCForAll: boolean;
  }> {
    try {
      const [stats, validityPeriod, requireKYCForAll] = await Promise.all([
        this.selfKYCContract.getStatistics(),
        this.complianceContract.kycValidityPeriod(),
        this.complianceContract.requireKYCForAll()
      ]);

      return {
        totalVerifications: stats[0],
        uniqueUsers: stats[1],
        kycValidityPeriod: validityPeriod,
        requireKYCForAll
      };
    } catch (error: any) {
      console.error('Failed to get system stats:', error);
      throw new Error(`Failed to get system stats: ${error.message}`);
    }
  }

  /**
   * Format KYC data for display
   */
  static formatKYCData(kycData: KYCData): {
    status: string;
    documentType: string;
    verifiedDate: string;
    ofacStatus: string;
    verificationCount: string;
  } {
    const documentTypes = {
      1: 'E-Passport',
      2: 'EU ID Card',
      3: 'National ID',
      4: 'Driver License',
      5: 'Other'
    };

    return {
      status: kycData.isVerified ? 'Verified' : 'Not Verified',
      documentType: documentTypes[kycData.documentType as keyof typeof documentTypes] || 'Unknown',
      verifiedDate: new Date(Number(kycData.timestamp) * 1000).toLocaleDateString(),
      ofacStatus: kycData.isOfacClear ? 'Clear' : 'Restricted',
      verificationCount: kycData.verificationCount.toString()
    };
  }

  /**
   * Format amount for display
   */
  static formatAmount(amountWei: bigint): string {
    return `$${ethers.formatEther(amountWei)}`;
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.complianceContract.removeAllListeners();
    this.selfKYCContract.removeAllListeners();
  }

  /**
   * Get contract addresses
   */
  getContractAddresses(): {
    complianceOracle: string;
    selfKYCVerifier: string;
  } {
    return {
      complianceOracle: this.complianceContract.target as string,
      selfKYCVerifier: this.selfKYCContract.target as string
    };
  }
}

/**
 * Utility functions for Self.xyz integration
 */
export class SelfIntegrationUtils {
  /**
   * Check if user needs KYC verification
   */
  static async checkKYCRequired(
    complianceOracle: EnhancedComplianceOracle,
    userAddress: string
  ): Promise<{
    required: boolean;
    reason?: string;
  }> {
    try {
      const status = await complianceOracle.getComplianceStatus(userAddress);
      
      if (!status.isKYCCompliant) {
        return {
          required: true,
          reason: status.restrictions?.join(', ') || 'KYC verification required'
        };
      }
      
      return { required: false };
    } catch (error: any) {
      return {
        required: true,
        reason: `Unable to verify KYC status: ${error.message}`
      };
    }
  }

  /**
   * Get user's compliance tier based on KYC data
   */
  static getComplianceTier(kycData: KYCData): {
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Restricted';
    maxAmount: string;
    features: string[];
  } {
    if (!kycData.isVerified) {
      return {
        tier: 'Restricted',
        maxAmount: '$0',
        features: ['KYC verification required']
      };
    }

    if (!kycData.isOfacClear) {
      return {
        tier: 'Restricted',
        maxAmount: '$0',
        features: ['OFAC restriction']
      };
    }

    // Determine tier based on document type and other factors
    switch (kycData.documentType) {
      case 1: // E-Passport
        return {
          tier: 'Platinum',
          maxAmount: '$100,000+',
          features: ['Highest withdrawal limits', 'Premium support', 'Advanced features']
        };
      case 2: // EU ID Card
        return {
          tier: 'Gold',
          maxAmount: '$50,000',
          features: ['High withdrawal limits', 'Priority support']
        };
      default:
        return {
          tier: 'Silver',
          maxAmount: '$25,000',
          features: ['Standard withdrawal limits', 'Basic support']
        };
    }
  }
}
