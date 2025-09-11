// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {ComplianceOracleStub} from "../src/oracle/ComplianceOracleStub.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {MockVerifier} from "../src/mocks/MockVerifier.sol";

contract ShieldedVaultDepositTest is Test {
    ShieldedVault vault;
    ComplianceOracleStub oracle;
    MockVerifier verifier;
    MockERC20 usdc;
    address user = address(0x1234);

    function setUp() public {
        oracle = new ComplianceOracleStub();
        verifier = new MockVerifier(true);
        vault = new ShieldedVault(address(oracle), address(verifier));
        usdc = new MockERC20("USDC", "USDC");

        vault.setSupportedToken(address(usdc), true);
        uint256[] memory denoms = new uint256[](1);
        denoms[0] = 100e6; // pretend 6 decimals bucket
        vault.setDenominations(address(usdc), denoms);

        usdc.mint(user, 100e6);
    }

    function test_DepositTransfersAndRecords() public {
        bytes32 commitment = keccak256("note");
        bytes memory proof = hex"1234"; // Mock proof
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        vault.deposit(address(usdc), 100e6, commitment, 0, proof);
        vm.stopPrank();
        assertEq(usdc.balanceOf(address(vault)), 100e6);
    }
}


