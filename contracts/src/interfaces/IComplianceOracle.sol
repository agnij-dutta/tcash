// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IComplianceOracle {
    /// @notice Check if a withdrawal is allowed based on threshold rules
    /// @param token The token being withdrawn
    /// @param amount The amount being withdrawn (in USD, scaled 1e18)
    /// @return allowed True if withdrawal is permitted
    function isExitAllowed(address token, uint256 amount) external view returns (bool);
    
    /// @notice Verify zk-attestation proof for compliance
    /// @param user The user attempting withdrawal
    /// @param attestationType Type of attestation (0=KYC, 1=Sanctions, etc.)
    /// @param proof The zk-proof or attestation data
    /// @param amount The withdrawal amount (in USD, scaled 1e18)
    /// @return verified True if attestation is valid
    function verifyAttestationProof(
        address user, 
        uint8 attestationType, 
        bytes calldata proof, 
        uint256 amount
    ) external view returns (bool verified);
    
    /// @notice Check if withdrawal requires attestation
    /// @param token The token being withdrawn
    /// @param amount The amount being withdrawn (in USD, scaled 1e18)
    /// @return requiresAttestation True if attestation is required
    function requiresAttestation(address token, uint256 amount) external view returns (bool requiresAttestation);
}


