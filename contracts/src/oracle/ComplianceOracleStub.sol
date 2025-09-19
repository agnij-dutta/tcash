// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IComplianceOracle} from "../interfaces/IComplianceOracle.sol";

// Interface for the existing SelfKYCVerifier contract
interface ISelfKYCVerifier {
    struct KYCData {
        bool isVerified;
        uint256 timestamp;
        string nationality;
        uint8 documentType;
        bool isOfacClear;
        uint256 verificationCount;
    }
    
    function isKYCVerified(address user) external view returns (bool);
    function getKYCData(address user) external view returns (KYCData memory);
}

contract ComplianceOracleStub is IComplianceOracle {
    address public owner;
    mapping(address => uint256) public tokenUsdThreshold; // per-token USD threshold (scaled 1e18)
    
    // Self.xyz Integration
    ISelfKYCVerifier public selfKYCVerifier;
    
    // KYC Configuration for compliance checks
    uint256 public kycValidityPeriod = 365 days; // KYC expires after 1 year
    bool public requireKYCForAll = true; // Require KYC for all transactions
    
    // Document type based limits (scaled 1e18)
    mapping(uint8 => uint256) public documentTypeMaxAmount;
    
    // Age based multipliers (basis points, 10000 = 100%)
    mapping(uint256 => uint256) public ageMultipliers;
    
    // Events
    event SelfKYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event KYCConfigUpdated(uint256 validityPeriod, bool requireKYCForAll);
    event DocumentTypeLimitSet(uint8 indexed documentType, uint256 maxAmount);
    event AgeMultiplierSet(uint256 indexed ageThreshold, uint256 multiplier);

    error NotOwner();
    error InvalidSelfKYCVerifier();
    error UserNotKYCVerified();
    error KYCExpired();
    error OfacRestricted();
    error ExceedsKYCLimit();

    constructor(address _selfKYCVerifier) {
        owner = msg.sender;
        
        // Set the existing deployed SelfKYCVerifier contract
        if (_selfKYCVerifier != address(0)) {
            selfKYCVerifier = ISelfKYCVerifier(_selfKYCVerifier);
        }
        
        // Set default document type limits (in USD, scaled 1e18)
        documentTypeMaxAmount[1] = 50000 * 1e18; // E-Passport: $50,000
        documentTypeMaxAmount[2] = 30000 * 1e18; // EU ID Card: $30,000
        documentTypeMaxAmount[3] = 20000 * 1e18; // Other documents: $20,000
        
        // Set default age multipliers (basis points)
        ageMultipliers[18] = 5000;  // 18+: 50% of base limit
        ageMultipliers[25] = 10000; // 25+: 100% of base limit
        ageMultipliers[35] = 15000; // 35+: 150% of base limit
        ageMultipliers[50] = 20000; // 50+: 200% of base limit
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setThreshold(address token, uint256 usdThreshold1e18) external onlyOwner {
        tokenUsdThreshold[token] = usdThreshold1e18;
    }

    function isExitAllowed(address token, uint256 amountUsd1e18) external view returns (bool) {
        address user = tx.origin; // Get the original transaction sender
        
        // If KYC is required for all transactions, check KYC status
        if (requireKYCForAll) {
            if (address(selfKYCVerifier) == address(0)) {
                return false; // No KYC verifier set
            }
            
            if (!selfKYCVerifier.isKYCVerified(user)) {
                return false; // User not KYC verified
            }
            
            ISelfKYCVerifier.KYCData memory kycData = selfKYCVerifier.getKYCData(user);
            
            // Check if KYC has expired
            if (block.timestamp > kycData.timestamp + kycValidityPeriod) {
                return false; // KYC expired
            }
            
            // Check OFAC status
            if (!kycData.isOfacClear) {
                return false; // OFAC restricted
            }
            
            // Calculate user's maximum allowed amount based on KYC data
            uint256 userMaxAmount = _calculateUserMaxAmount(kycData);
            
            // Check if requested amount exceeds user's KYC-based limit
            if (amountUsd1e18 > userMaxAmount) {
                return false; // Exceeds KYC-based limit
            }
        }
        
        // Check token-specific threshold
        uint256 tokenThreshold = tokenUsdThreshold[token];
        if (tokenThreshold > 0 && amountUsd1e18 > tokenThreshold) {
            return false; // Exceeds token threshold
        }
        
        return true;
    }
    
    /**
     * @dev Calculate maximum allowed amount based on user's KYC data
     * @param kycData The user's KYC data from SelfKYCVerifier
     * @return Maximum allowed amount in USD (scaled 1e18)
     */
    function _calculateUserMaxAmount(ISelfKYCVerifier.KYCData memory kycData) internal view returns (uint256) {
        // Get base amount from document type
        uint256 baseAmount = documentTypeMaxAmount[kycData.documentType];
        if (baseAmount == 0) {
            baseAmount = 10000 * 1e18; // Default $10,000 if document type not configured
        }
        
        // Apply age multiplier
        uint256 ageMultiplier = _getAgeMultiplier(kycData.timestamp);
        baseAmount = (baseAmount * ageMultiplier) / 10000;
        
        return baseAmount;
    }
    
    /**
     * @dev Get age multiplier based on verification timestamp (rough age estimation)
     * @param verificationTimestamp When the user was verified
     * @return Age multiplier in basis points
     */
    function _getAgeMultiplier(uint256 verificationTimestamp) internal view returns (uint256) {
        // Rough estimation: assume user was 25 at verification + time passed
        uint256 timePassedYears = (block.timestamp - verificationTimestamp) / 365 days;
        uint256 estimatedAge = 25 + timePassedYears;
        
        // Find the highest age threshold that applies
        if (estimatedAge >= 50) return ageMultipliers[50];
        if (estimatedAge >= 35) return ageMultipliers[35];
        if (estimatedAge >= 25) return ageMultipliers[25];
        return ageMultipliers[18]; // Minimum age
    }
    
    // ========================================
    // Admin Functions
    // ========================================
    
    /**
     * @dev Set the SelfKYCVerifier contract address
     * @param _selfKYCVerifier Address of the deployed SelfKYCVerifier contract
     */
    function setSelfKYCVerifier(address _selfKYCVerifier) external onlyOwner {
        require(_selfKYCVerifier != address(0), "Invalid verifier address");
        
        address oldVerifier = address(selfKYCVerifier);
        selfKYCVerifier = ISelfKYCVerifier(_selfKYCVerifier);
        
        emit SelfKYCVerifierUpdated(oldVerifier, _selfKYCVerifier);
    }
    
    /**
     * @dev Update KYC configuration
     * @param _validityPeriod How long KYC verification remains valid
     * @param _requireKYCForAll Whether to require KYC for all transactions
     */
    function updateKYCConfig(uint256 _validityPeriod, bool _requireKYCForAll) external onlyOwner {
        kycValidityPeriod = _validityPeriod;
        requireKYCForAll = _requireKYCForAll;
        
        emit KYCConfigUpdated(_validityPeriod, _requireKYCForAll);
    }
    
    /**
     * @dev Set maximum amount for a document type
     * @param documentType Document type (1=E-Passport, 2=EU ID Card, etc.)
     * @param maxAmount Maximum amount in USD (scaled 1e18)
     */
    function setDocumentTypeLimit(uint8 documentType, uint256 maxAmount) external onlyOwner {
        documentTypeMaxAmount[documentType] = maxAmount;
        emit DocumentTypeLimitSet(documentType, maxAmount);
    }
    
    /**
     * @dev Set age-based multiplier
     * @param ageThreshold Age threshold
     * @param multiplier Multiplier in basis points (10000 = 100%)
     */
    function setAgeMultiplier(uint256 ageThreshold, uint256 multiplier) external onlyOwner {
        ageMultipliers[ageThreshold] = multiplier;
        emit AgeMultiplierSet(ageThreshold, multiplier);
    }
    
    // ========================================
    // View Functions
    // ========================================
    
    /**
     * @dev Get user's maximum allowed amount based on their KYC status
     * @param user User address to check
     * @return Maximum allowed amount in USD (scaled 1e18)
     */
    function getUserMaxAmount(address user) external view returns (uint256) {
        if (address(selfKYCVerifier) == address(0)) {
            return 0;
        }
        
        if (!selfKYCVerifier.isKYCVerified(user)) {
            return 0;
        }
        
        ISelfKYCVerifier.KYCData memory kycData = selfKYCVerifier.getKYCData(user);
        
        // Check if KYC has expired
        if (block.timestamp > kycData.timestamp + kycValidityPeriod) {
            return 0;
        }
        
        // Check OFAC status
        if (!kycData.isOfacClear) {
            return 0;
        }
        
        return _calculateUserMaxAmount(kycData);
    }
    
    /**
     * @dev Check if user is KYC compliant
     * @param user User address to check
     * @return isCompliant Whether user meets all KYC requirements
     */
    function isUserKYCCompliant(address user) external view returns (bool) {
        if (address(selfKYCVerifier) == address(0)) {
            return !requireKYCForAll; // If no verifier and KYC not required, allow
        }
        
        if (!requireKYCForAll) {
            return true; // KYC not required
        }
        
        if (!selfKYCVerifier.isKYCVerified(user)) {
            return false;
        }
        
        ISelfKYCVerifier.KYCData memory kycData = selfKYCVerifier.getKYCData(user);
        
        // Check expiration
        if (block.timestamp > kycData.timestamp + kycValidityPeriod) {
            return false;
        }
        
        // Check OFAC
        return kycData.isOfacClear;
    }
    
    /**
     * @dev Get the current SelfKYCVerifier contract address
     * @return Address of the SelfKYCVerifier contract
     */
    function getSelfKYCVerifier() external view returns (address) {
        return address(selfKYCVerifier);
    }
}


