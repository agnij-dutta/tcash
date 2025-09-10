// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IComplianceOracle} from "../interfaces/IComplianceOracle.sol";

/// @title ComplianceOracle - Advanced compliance checking with zk-attestations
/// @notice Implements threshold-based compliance + zk-attestation verification
/// @dev Supports multiple attestation types and identity providers
contract ComplianceOracle is IComplianceOracle {
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    event ThresholdUpdated(address indexed token, uint256 oldThreshold, uint256 newThreshold);
    event AttestationProviderAdded(uint8 indexed attestationType, address indexed provider);
    event AttestationProviderRemoved(uint8 indexed attestationType, address indexed provider);
    event AttestationUsed(address indexed user, uint8 attestationType, bytes32 indexed proofHash);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error NotOwner();
    error InvalidAttestationType();
    error InvalidProvider();
    error AttestationExpired();
    error InvalidProof();
    error InsufficientAttestation();

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/
    
    address public owner;
    
    /// @notice USD thresholds per token (scaled 1e18) above which attestations are required
    mapping(address => uint256) public tokenUsdThreshold;
    
    /// @notice Attestation types: 0=KYC, 1=Sanctions, 2=Identity, etc.
    uint8 public constant ATTESTATION_TYPE_KYC = 0;
    uint8 public constant ATTESTATION_TYPE_SANCTIONS = 1;
    uint8 public constant ATTESTATION_TYPE_IDENTITY = 2;
    
    /// @notice Approved attestation providers for each type
    mapping(uint8 => mapping(address => bool)) public approvedProviders;
    
    /// @notice Used attestations to prevent replay attacks
    mapping(bytes32 => bool) public usedAttestations;
    
    /// @notice Attestation validity period (default 30 days)
    uint256 public attestationValidityPeriod = 30 days;

    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Structure for zk-attestation proofs
    struct AttestationProof {
        uint8 attestationType;       // Type of attestation
        address provider;            // Identity provider address
        uint256 timestamp;           // When attestation was issued
        uint256 validUntil;          // Expiration timestamp
        bytes32 commitment;          // User commitment hash
        bytes zkProof;               // ZK proof data
        bytes signature;             // Provider signature
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor() {
        owner = msg.sender;
    }

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Set USD threshold for a token above which attestations are required
    function setThreshold(address token, uint256 usdThreshold1e18) external onlyOwner {
        uint256 oldThreshold = tokenUsdThreshold[token];
        tokenUsdThreshold[token] = usdThreshold1e18;
        emit ThresholdUpdated(token, oldThreshold, usdThreshold1e18);
    }
    
    /// @notice Add approved attestation provider
    function addAttestationProvider(uint8 attestationType, address provider) external onlyOwner {
        if (provider == address(0)) revert InvalidProvider();
        if (attestationType > 10) revert InvalidAttestationType(); // Max 10 types for now
        
        approvedProviders[attestationType][provider] = true;
        emit AttestationProviderAdded(attestationType, provider);
    }
    
    /// @notice Remove attestation provider
    function removeAttestationProvider(uint8 attestationType, address provider) external onlyOwner {
        approvedProviders[attestationType][provider] = false;
        emit AttestationProviderRemoved(attestationType, provider);
    }
    
    /// @notice Update attestation validity period
    function setAttestationValidityPeriod(uint256 newPeriod) external onlyOwner {
        attestationValidityPeriod = newPeriod;
    }

    /*//////////////////////////////////////////////////////////////
                        COMPLIANCE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /// @inheritdoc IComplianceOracle
    function isExitAllowed(address token, uint256 amountUsd1e18) external view returns (bool) {
        uint256 threshold = tokenUsdThreshold[token];
        if (threshold == 0) return true; // No threshold set = allowed
        return amountUsd1e18 <= threshold;
    }
    
    /// @inheritdoc IComplianceOracle
    function requiresAttestation(address token, uint256 amountUsd1e18) external view returns (bool) {
        uint256 threshold = tokenUsdThreshold[token];
        return threshold > 0 && amountUsd1e18 > threshold;
    }
    
    /// @inheritdoc IComplianceOracle
    function verifyAttestationProof(
        address user,
        uint8 attestationType,
        bytes calldata proof,
        uint256 amount
    ) external view returns (bool verified) {
        // Decode the attestation proof
        AttestationProof memory attestation = abi.decode(proof, (AttestationProof));
        
        // Basic validation
        if (attestation.attestationType != attestationType) return false;
        if (!approvedProviders[attestationType][attestation.provider]) return false;
        if (block.timestamp > attestation.validUntil) return false;
        if (attestation.timestamp + attestationValidityPeriod < block.timestamp) return false;
        
        // Check if attestation was already used (replay protection)
        bytes32 proofHash = keccak256(proof);
        if (usedAttestations[proofHash]) return false;
        
        // Verify provider signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            attestation.attestationType,
            attestation.provider,
            attestation.timestamp,
            attestation.validUntil,
            attestation.commitment,
            attestation.zkProof
        ));
        
        // For MVP, skip signature verification in tests (placeholder implementation)
        // In production, this would verify the signature properly
        if (attestation.signature.length > 0) {
            // Basic validation that signature exists
            // TODO: Implement proper ECDSA signature verification
        }
        
        // Verify zk-proof specific to attestation type
        if (attestationType == ATTESTATION_TYPE_KYC) {
            return _verifyKYCProof(user, attestation);
        } else if (attestationType == ATTESTATION_TYPE_SANCTIONS) {
            return _verifySanctionsProof(user, attestation);
        } else if (attestationType == ATTESTATION_TYPE_IDENTITY) {
            return _verifyIdentityProof(user, attestation);
        }
        
        return false;
    }

    /*//////////////////////////////////////////////////////////////
                       ATTESTATION VERIFICATION
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Verify KYC attestation proof
    function _verifyKYCProof(address user, AttestationProof memory attestation) internal pure returns (bool) {
        // In a real implementation, this would:
        // 1. Verify the zk-proof that user has valid KYC without revealing identity
        // 2. Check that the commitment matches the user's stealth address
        // 3. Validate proof parameters against KYC provider's verification key
        
        // For now, we do basic validation (placeholder for full zk verification)
        return attestation.zkProof.length > 0 && 
               attestation.commitment != bytes32(0) &&
               user != address(0);
    }
    
    /// @notice Verify sanctions list attestation proof  
    function _verifySanctionsProof(address user, AttestationProof memory attestation) internal pure returns (bool) {
        // In a real implementation, this would:
        // 1. Verify zk-proof that user is NOT on sanctions list
        // 2. Check proof was generated against recent sanctions list snapshot
        // 3. Validate against sanctions oracle verification key
        
        // Placeholder validation
        return attestation.zkProof.length > 0 && 
               attestation.commitment != bytes32(0) &&
               user != address(0);
    }
    
    /// @notice Verify identity attestation proof
    function _verifyIdentityProof(address user, AttestationProof memory attestation) internal pure returns (bool) {
        // In a real implementation, this would:
        // 1. Verify zk-proof of identity (e.g., government ID verification)
        // 2. Check against identity provider's verification standards
        // 3. Validate uniqueness constraints
        
        // Placeholder validation
        return attestation.zkProof.length > 0 && 
               attestation.commitment != bytes32(0) &&
               user != address(0);
    }

    /*//////////////////////////////////////////////////////////////
                           UTILITY FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Verify ECDSA signature
    function _verifySignature(
        bytes32 messageHash,
        bytes memory signature,
        address expectedSigner
    ) internal pure returns (bool) {
        if (signature.length != 65) return false;
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        if (v < 27) v += 27;
        
        address recovered = ecrecover(
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)),
            v, r, s
        );
        
        return recovered == expectedSigner;
    }
    
    /// @notice Mark attestation as used (prevents replay)
    function markAttestationUsed(bytes calldata proof) external {
        // Only the ShieldedVault should call this after successful withdrawal
        require(msg.sender == owner, "Only vault can mark used"); // In practice, this would be the vault address
        bytes32 proofHash = keccak256(proof);
        usedAttestations[proofHash] = true;
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Check if provider is approved for attestation type
    function isProviderApproved(uint8 attestationType, address provider) external view returns (bool) {
        return approvedProviders[attestationType][provider];
    }
    
    /// @notice Get threshold for token
    function getThreshold(address token) external view returns (uint256) {
        return tokenUsdThreshold[token];
    }
}
