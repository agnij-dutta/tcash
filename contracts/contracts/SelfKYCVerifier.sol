// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SelfKYCVerifier
 * @notice A KYC verification contract using Self.xyz zero-knowledge identity proofs
 * @dev Extends SelfVerificationRoot to leverage Self's verification infrastructure
 * @author Your Team
 */
contract SelfKYCVerifier is SelfVerificationRoot, Ownable, ReentrancyGuard, Pausable {

    // ========================================
    // Data Structures
    // ========================================

    struct KYCData {
        bool isVerified;
        uint256 timestamp;
        string nationality;
        uint8 documentType; // 1=E-Passport, 2=EU ID Card, etc.
        bool isOfacClear;
        uint256 verificationCount;
    }

    struct VerificationConfig {
        uint256 configId;
        string scope;
        bool requireOfacCheck;
        uint256 minimumAge;
        string[] excludedCountries;
        uint8[] allowedDocumentTypes;
        bool isActive;
    }

    // ========================================
    // State Variables
    // ========================================

    // User address => KYC data
    mapping(address => KYCData) public userKYC;

    // Nullifier => User address (prevents sybil attacks)
    mapping(uint256 => address) public nullifierToUser;

    // Nullifier => verification status
    mapping(uint256 => bool) public verifiedNullifiers;

    // User address => nullifier (for reverse lookup)
    mapping(address => uint256) public userToNullifier;

    // Configuration management
    VerificationConfig public currentConfig;

    // Statistics
    uint256 public totalVerifications;
    uint256 public uniqueUsers;

    // Emergency controls
    bool public emergencyStop;

    // ========================================
    // Events
    // ========================================

    event KYCVerified(
        address indexed user,
        uint256 indexed nullifier,
        string nationality,
        uint8 documentType,
        uint256 timestamp,
        bool isOfacClear
    );

    event KYCRevoked(
        address indexed user,
        uint256 indexed nullifier,
        string reason,
        uint256 timestamp
    );

    event ConfigurationUpdated(
        uint256 indexed configId,
        string scope,
        uint256 minimumAge,
        bool requireOfacCheck
    );

    event EmergencyStopActivated(address indexed admin, uint256 timestamp);
    event EmergencyStopDeactivated(address indexed admin, uint256 timestamp);

    // ========================================
    // Modifiers
    // ========================================

    modifier notInEmergency() {
        require(!emergencyStop, "SelfKYCVerifier: Emergency stop activated");
        _;
    }

    modifier validUser(address user) {
        require(user != address(0), "SelfKYCVerifier: Invalid user address");
        _;
    }

    // ========================================
    // Constructor
    // ========================================

    constructor(
        uint256 _configId,
        string memory _scope,
        bool _requireOfacCheck,
        uint256 _minimumAge,
        string[] memory _excludedCountries,
        uint8[] memory _allowedDocumentTypes
    ) SelfVerificationRoot(_configId, _scope) Ownable(msg.sender) {
        currentConfig = VerificationConfig({
            configId: _configId,
            scope: _scope,
            requireOfacCheck: _requireOfacCheck,
            minimumAge: _minimumAge,
            excludedCountries: _excludedCountries,
            allowedDocumentTypes: _allowedDocumentTypes,
            isActive: true
        });

        emit ConfigurationUpdated(_configId, _scope, _minimumAge, _requireOfacCheck);
    }

    // ========================================
    // Self.xyz Integration - Custom Verification Hook
    // ========================================

    /**
     * @notice Custom verification logic called after Self proof validation
     * @dev This function is called by SelfVerificationRoot after successful proof verification
     * @param nullifier The unique nullifier from the proof
     * @param userIdentifier User identifier from the proof
     * @param extractedAttrs Extracted attributes from the document
     */
    function customVerificationHook(
        uint256 nullifier,
        uint256 userIdentifier,
        ExtractedAttrs memory extractedAttrs
    ) internal override nonReentrant notInEmergency {
        // Prevent duplicate verifications
        require(!verifiedNullifiers[nullifier], "SelfKYCVerifier: Nullifier already used");

        // Prevent user from verifying with different nullifiers
        if (userToNullifier[msg.sender] != 0) {
            require(userToNullifier[msg.sender] == nullifier, "SelfKYCVerifier: User already verified with different identity");
        }

        // Validate configuration requirements
        _validateVerificationRequirements(extractedAttrs);

        // Store the verification data
        bool isNewUser = !userKYC[msg.sender].isVerified;

        userKYC[msg.sender] = KYCData({
            isVerified: true,
            timestamp: block.timestamp,
            nationality: extractedAttrs.nationality,
            documentType: extractedAttrs.documentType,
            isOfacClear: !extractedAttrs.isOfacMatch,
            verificationCount: userKYC[msg.sender].verificationCount + 1
        });

        // Update mappings
        nullifierToUser[nullifier] = msg.sender;
        verifiedNullifiers[nullifier] = true;
        userToNullifier[msg.sender] = nullifier;

        // Update statistics
        totalVerifications++;
        if (isNewUser) {
            uniqueUsers++;
        }

        // Emit verification event
        emit KYCVerified(
            msg.sender,
            nullifier,
            extractedAttrs.nationality,
            extractedAttrs.documentType,
            block.timestamp,
            !extractedAttrs.isOfacMatch
        );
    }

    /**
     * @notice Validate verification meets configuration requirements
     * @param extractedAttrs The extracted attributes to validate
     */
    function _validateVerificationRequirements(ExtractedAttrs memory extractedAttrs) internal view {
        require(currentConfig.isActive, "SelfKYCVerifier: Configuration not active");

        // Check OFAC requirement
        if (currentConfig.requireOfacCheck) {
            require(!extractedAttrs.isOfacMatch, "SelfKYCVerifier: OFAC check failed");
        }

        // Check age requirement
        if (currentConfig.minimumAge > 0) {
            require(extractedAttrs.ageAtLeast >= currentConfig.minimumAge, "SelfKYCVerifier: Age requirement not met");
        }

        // Check document type
        if (currentConfig.allowedDocumentTypes.length > 0) {
            bool documentTypeAllowed = false;
            for (uint i = 0; i < currentConfig.allowedDocumentTypes.length; i++) {
                if (currentConfig.allowedDocumentTypes[i] == extractedAttrs.documentType) {
                    documentTypeAllowed = true;
                    break;
                }
            }
            require(documentTypeAllowed, "SelfKYCVerifier: Document type not allowed");
        }

        // Check excluded countries
        for (uint i = 0; i < currentConfig.excludedCountries.length; i++) {
            require(
                keccak256(bytes(extractedAttrs.nationality)) != keccak256(bytes(currentConfig.excludedCountries[i])),
                "SelfKYCVerifier: Nationality not allowed"
            );
        }
    }

    // ========================================
    // Public View Functions
    // ========================================

    /**
     * @notice Check if a user is KYC verified
     * @param user The user address to check
     * @return isVerified Whether the user is verified
     */
    function isKYCVerified(address user) external view validUser(user) returns (bool) {
        return userKYC[user].isVerified;
    }

    /**
     * @notice Get KYC data for a user
     * @param user The user address
     * @return KYC data struct
     */
    function getKYCData(address user) external view validUser(user) returns (KYCData memory) {
        return userKYC[user];
    }

    /**
     * @notice Get user address from nullifier
     * @param nullifier The nullifier to lookup
     * @return user address
     */
    function getUserFromNullifier(uint256 nullifier) external view returns (address) {
        return nullifierToUser[nullifier];
    }

    /**
     * @notice Check if a nullifier has been used
     * @param nullifier The nullifier to check
     * @return isUsed Whether the nullifier has been used
     */
    function isNullifierUsed(uint256 nullifier) external view returns (bool) {
        return verifiedNullifiers[nullifier];
    }

    /**
     * @notice Get current verification configuration
     * @return Current configuration struct
     */
    function getConfiguration() external view returns (VerificationConfig memory) {
        return currentConfig;
    }

    /**
     * @notice Get verification statistics
     * @return totalVerifications Total number of verifications
     * @return uniqueUsers Number of unique verified users
     */
    function getStatistics() external view returns (uint256, uint256) {
        return (totalVerifications, uniqueUsers);
    }

    // ========================================
    // Admin Functions
    // ========================================

    /**
     * @notice Update verification configuration
     * @param _configId New configuration ID
     * @param _scope New scope
     * @param _requireOfacCheck Whether to require OFAC check
     * @param _minimumAge Minimum age requirement
     * @param _excludedCountries Array of excluded country codes
     * @param _allowedDocumentTypes Array of allowed document types
     */
    function updateConfiguration(
        uint256 _configId,
        string memory _scope,
        bool _requireOfacCheck,
        uint256 _minimumAge,
        string[] memory _excludedCountries,
        uint8[] memory _allowedDocumentTypes
    ) external onlyOwner {
        currentConfig = VerificationConfig({
            configId: _configId,
            scope: _scope,
            requireOfacCheck: _requireOfacCheck,
            minimumAge: _minimumAge,
            excludedCountries: _excludedCountries,
            allowedDocumentTypes: _allowedDocumentTypes,
            isActive: true
        });

        // Update the parent contract's configuration
        _setScope(_scope);
        _setConfigId(_configId);

        emit ConfigurationUpdated(_configId, _scope, _minimumAge, _requireOfacCheck);
    }

    /**
     * @notice Revoke KYC verification for a user (emergency use only)
     * @param user The user to revoke
     * @param reason Reason for revocation
     */
    function revokeKYC(address user, string memory reason) external onlyOwner validUser(user) {
        require(userKYC[user].isVerified, "SelfKYCVerifier: User not verified");

        uint256 nullifier = userToNullifier[user];

        // Reset user data
        delete userKYC[user];
        delete nullifierToUser[nullifier];
        delete verifiedNullifiers[nullifier];
        delete userToNullifier[user];

        // Update statistics
        uniqueUsers--;

        emit KYCRevoked(user, nullifier, reason, block.timestamp);
    }

    /**
     * @notice Activate emergency stop
     */
    function activateEmergencyStop() external onlyOwner {
        emergencyStop = true;
        _pause();
        emit EmergencyStopActivated(msg.sender, block.timestamp);
    }

    /**
     * @notice Deactivate emergency stop
     */
    function deactivateEmergencyStop() external onlyOwner {
        emergencyStop = false;
        _unpause();
        emit EmergencyStopDeactivated(msg.sender, block.timestamp);
    }

    /**
     * @notice Pause contract (stops new verifications)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ========================================
    // Override Functions
    // ========================================

    /**
     * @notice Override to add pause functionality to verification
     */
    function verify(
        uint256 nullifier,
        uint256 userIdentifier,
        ExtractedAttrs calldata extractedAttrs,
        bytes calldata proof
    ) public override whenNotPaused notInEmergency {
        super.verify(nullifier, userIdentifier, extractedAttrs, proof);
    }
}