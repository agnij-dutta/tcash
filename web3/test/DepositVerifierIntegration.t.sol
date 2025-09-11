// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {ComplianceOracleStub} from "../src/oracle/ComplianceOracleStub.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {DepositVerifierWrapper} from "../src/verifiers/DepositVerifierWrapper.sol";
import {Groth16Verifier} from "../zk/contracts/verifiers/DepositVerifier.sol";

contract DepositVerifierIntegrationTest is Test {
    ShieldedVault vault;
    ComplianceOracleStub oracle;
    DepositVerifierWrapper verifierWrapper;
    Groth16Verifier realVerifier;
    MockERC20 usdc;
    address user = address(0x1234);

    function setUp() public {
        oracle = new ComplianceOracleStub();
        
        // Deploy the real DepositVerifier
        realVerifier = new Groth16Verifier();
        
        // Deploy the wrapper
        verifierWrapper = new DepositVerifierWrapper(address(realVerifier));
        
        // Deploy vault with real verifier
        vault = new ShieldedVault(address(oracle), address(verifierWrapper));
        usdc = new MockERC20("USDC", "USDC");

        vault.setSupportedToken(address(usdc), true);
        uint256[] memory denoms = new uint256[](1);
        denoms[0] = 100e6; // pretend 6 decimals bucket
        vault.setDenominations(address(usdc), denoms);

        usdc.mint(user, 100e6);
    }

    function test_RealVerifierIntegration() public {
        bytes32 commitment = keccak256("note");
        
        // These would be real proof components from a valid ZK proof
        // For now, we'll use dummy values that will fail verification
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        
        // This should fail because we're using dummy proof components
        vm.expectRevert("INVALID_DEPOSIT_PROOF");
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        
        vm.stopPrank();
    }
    
    function test_VerifierWrapperWorks() public {
        // Test that the wrapper correctly calls the real verifier
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        uint[3] memory _pubSignals = [uint(1), uint(2), uint(3)];
        
        // This should return false for dummy proof components
        bool result = verifierWrapper.verifyProof(_pA, _pB, _pC, _pubSignals);
        assertFalse(result, "Dummy proof should fail verification");
    }
}
