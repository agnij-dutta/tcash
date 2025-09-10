// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {ComplianceOracle} from "../src/oracle/ComplianceOracle.sol";
import {IComplianceOracle} from "../src/interfaces/IComplianceOracle.sol";

contract ComplianceOracleTest is Test {
    ComplianceOracle oracle;
    
    address owner = address(0x1);
    address user = address(0x2);
    address kycProvider = address(0x3);
    address sanctionsProvider = address(0x4);
    address unauthorizedProvider = address(0x5);
    
    address tokenUSDC = address(0x100);
    address tokenETH = address(0x101);
    
    uint256 constant USD_THRESHOLD = 10_000e18; // $10,000 USD
    uint256 constant SMALL_AMOUNT = 5_000e18;   // $5,000 USD
    uint256 constant LARGE_AMOUNT = 15_000e18;  // $15,000 USD

    function setUp() public {
        vm.startPrank(owner);
        oracle = new ComplianceOracle();
        
        // Set up initial thresholds
        oracle.setThreshold(tokenUSDC, USD_THRESHOLD);
        oracle.setThreshold(tokenETH, USD_THRESHOLD);
        
        // Add attestation providers
        oracle.addAttestationProvider(oracle.ATTESTATION_TYPE_KYC(), kycProvider);
        oracle.addAttestationProvider(oracle.ATTESTATION_TYPE_SANCTIONS(), sanctionsProvider);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                            THRESHOLD TESTS
    //////////////////////////////////////////////////////////////*/

    function testThresholdSetting() public {
        vm.prank(owner);
        oracle.setThreshold(tokenUSDC, 20_000e18);
        
        assertEq(oracle.getThreshold(tokenUSDC), 20_000e18);
    }

    function testThresholdSettingOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(ComplianceOracle.NotOwner.selector);
        oracle.setThreshold(tokenUSDC, 20_000e18);
    }

    function testIsExitAllowedBelowThreshold() public {
        assertTrue(oracle.isExitAllowed(tokenUSDC, SMALL_AMOUNT));
    }

    function testIsExitAllowedAboveThreshold() public {
        assertFalse(oracle.isExitAllowed(tokenUSDC, LARGE_AMOUNT));
    }

    function testIsExitAllowedNoThresholdSet() public {
        address newToken = address(0x999);
        assertTrue(oracle.isExitAllowed(newToken, LARGE_AMOUNT));
    }

    function testRequiresAttestation() public {
        assertTrue(oracle.requiresAttestation(tokenUSDC, LARGE_AMOUNT));
        assertFalse(oracle.requiresAttestation(tokenUSDC, SMALL_AMOUNT));
    }

    /*//////////////////////////////////////////////////////////////
                         PROVIDER MANAGEMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function testAddAttestationProvider() public {
        address newProvider = address(0x6);
        
        vm.prank(owner);
        oracle.addAttestationProvider(oracle.ATTESTATION_TYPE_IDENTITY(), newProvider);
        
        assertTrue(oracle.isProviderApproved(oracle.ATTESTATION_TYPE_IDENTITY(), newProvider));
    }

    function testAddAttestationProviderOnlyOwner() public {
        vm.prank(user);
        vm.expectRevert(ComplianceOracle.NotOwner.selector);
        oracle.addAttestationProvider(oracle.ATTESTATION_TYPE_KYC(), address(0x6));
    }

    function testAddInvalidProvider() public {
        vm.prank(owner);
        vm.expectRevert(ComplianceOracle.InvalidProvider.selector);
        oracle.addAttestationProvider(oracle.ATTESTATION_TYPE_KYC(), address(0));
    }

    function testRemoveAttestationProvider() public {
        vm.prank(owner);
        oracle.removeAttestationProvider(oracle.ATTESTATION_TYPE_KYC(), kycProvider);
        
        assertFalse(oracle.isProviderApproved(oracle.ATTESTATION_TYPE_KYC(), kycProvider));
    }

    /*//////////////////////////////////////////////////////////////
                       ATTESTATION VERIFICATION TESTS
    //////////////////////////////////////////////////////////////*/

    function testValidKYCAttestation() public {
        // Create a valid KYC attestation
        ComplianceOracle.AttestationProof memory attestation = _createValidKYCAttestation();
        bytes memory encodedProof = abi.encode(attestation);
        
        bool result = oracle.verifyAttestationProof(
            user,
            oracle.ATTESTATION_TYPE_KYC(),
            encodedProof,
            LARGE_AMOUNT
        );
        
        assertTrue(result);
    }

    function testInvalidProviderAttestation() public {
        ComplianceOracle.AttestationProof memory attestation = _createValidKYCAttestation();
        attestation.provider = unauthorizedProvider; // Use unauthorized provider
        
        bytes memory encodedProof = abi.encode(attestation);
        
        bool result = oracle.verifyAttestationProof(
            user,
            oracle.ATTESTATION_TYPE_KYC(),
            encodedProof,
            LARGE_AMOUNT
        );
        
        assertFalse(result);
    }

    function testExpiredAttestation() public {
        ComplianceOracle.AttestationProof memory attestation = _createValidKYCAttestation();
        attestation.validUntil = block.timestamp - 1; // Already expired
        
        bytes memory encodedProof = abi.encode(attestation);
        
        bool result = oracle.verifyAttestationProof(
            user,
            oracle.ATTESTATION_TYPE_KYC(),
            encodedProof,
            LARGE_AMOUNT
        );
        
        assertFalse(result);
    }

    function testWrongAttestationType() public {
        ComplianceOracle.AttestationProof memory attestation = _createValidKYCAttestation();
        bytes memory encodedProof = abi.encode(attestation);
        
        // Try to verify as sanctions proof instead of KYC
        bool result = oracle.verifyAttestationProof(
            user,
            oracle.ATTESTATION_TYPE_SANCTIONS(),
            encodedProof,
            LARGE_AMOUNT
        );
        
        assertFalse(result);
    }

    /*//////////////////////////////////////////////////////////////
                            SIGNATURE TESTS
    //////////////////////////////////////////////////////////////*/

    function testSignatureVerification() public {
        // This would test the internal signature verification
        // For now, we test indirectly through attestation verification
        
        ComplianceOracle.AttestationProof memory attestation = _createValidKYCAttestation();
        attestation.signature = "invalid_signature"; // Invalid signature
        
        bytes memory encodedProof = abi.encode(attestation);
        
        bool result = oracle.verifyAttestationProof(
            user,
            oracle.ATTESTATION_TYPE_KYC(),
            encodedProof,
            LARGE_AMOUNT
        );
        
        assertFalse(result);
    }

    /*//////////////////////////////////////////////////////////////
                           EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/

    function testZeroAddressUser() public {
        ComplianceOracle.AttestationProof memory attestation = _createValidKYCAttestation();
        bytes memory encodedProof = abi.encode(attestation);
        
        bool result = oracle.verifyAttestationProof(
            address(0),
            oracle.ATTESTATION_TYPE_KYC(),
            encodedProof,
            LARGE_AMOUNT
        );
        
        // Should still work for zero address (stealth addresses might be zero)
        assertTrue(result);
    }

    function testEmptyProofData() public {
        ComplianceOracle.AttestationProof memory attestation = _createValidKYCAttestation();
        attestation.zkProof = ""; // Empty proof
        
        bytes memory encodedProof = abi.encode(attestation);
        
        bool result = oracle.verifyAttestationProof(
            user,
            oracle.ATTESTATION_TYPE_KYC(),
            encodedProof,
            LARGE_AMOUNT
        );
        
        assertFalse(result);
    }

    function testAttestationValidityPeriodUpdate() public {
        uint256 newPeriod = 60 days;
        
        vm.prank(owner);
        oracle.setAttestationValidityPeriod(newPeriod);
        
        assertEq(oracle.attestationValidityPeriod(), newPeriod);
    }

    /*//////////////////////////////////////////////////////////////
                           HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _createValidKYCAttestation() internal view returns (ComplianceOracle.AttestationProof memory) {
        return ComplianceOracle.AttestationProof({
            attestationType: oracle.ATTESTATION_TYPE_KYC(),
            provider: kycProvider,
            timestamp: block.timestamp,
            validUntil: block.timestamp + 30 days,
            commitment: keccak256(abi.encodePacked(user, "kyc_commitment")),
            zkProof: "mock_zk_proof_data",
            signature: _generateMockSignature()
        });
    }

    function _generateMockSignature() internal pure returns (bytes memory) {
        // In a real test, this would generate a proper ECDSA signature
        // For now, return mock data that passes length check
        return abi.encodePacked(
            bytes32(uint256(0x1)), // r
            bytes32(uint256(0x2)), // s  
            uint8(27)              // v
        );
    }

    /*//////////////////////////////////////////////////////////////
                           FUZZING TESTS
    //////////////////////////////////////////////////////////////*/

    function testFuzzThresholdSetting(uint256 threshold) public {
        vm.assume(threshold <= type(uint128).max); // Reasonable upper bound
        
        vm.prank(owner);
        oracle.setThreshold(tokenUSDC, threshold);
        
        assertEq(oracle.getThreshold(tokenUSDC), threshold);
    }

    function testFuzzIsExitAllowed(uint256 amount, uint256 threshold) public {
        vm.assume(amount <= type(uint128).max);
        vm.assume(threshold <= type(uint128).max);
        vm.assume(threshold > 0);
        
        vm.prank(owner);
        oracle.setThreshold(tokenUSDC, threshold);
        
        bool expected = amount <= threshold;
        bool actual = oracle.isExitAllowed(tokenUSDC, amount);
        
        assertEq(actual, expected);
    }
}
