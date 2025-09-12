// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {eERC} from "../src/token/eERC.sol";
import {IeERC} from "../src/interfaces/IeERC.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {PrivacyRouter} from "../src/PrivacyRouter.sol";
import {ComplianceOracleStub} from "../src/oracle/ComplianceOracleStub.sol";
import {MockVerifier} from "../src/mocks/MockVerifier.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract eERCTransferControlTest is Test {
    eERC eUSDC;
    ShieldedVault vault;
    PrivacyRouter router;
    ComplianceOracleStub oracle;
    MockVerifier verifier;
    MockERC20 usdc;
    
    address owner = address(0x1);
    address user1 = address(0x2);
    address user2 = address(0x3);
    address unauthorized = address(0x4);

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        oracle = new ComplianceOracleStub();
        verifier = new MockVerifier(true);
        vault = new ShieldedVault(address(oracle), address(verifier));
        router = new PrivacyRouter(address(vault));
        usdc = new MockERC20("USDC", "USDC");
        
        // Deploy eERC with vault and router addresses
        eUSDC = new eERC("eUSDC", "eUSDC", address(vault), address(router));
        
        // Configure vault
        vault.setRouter(address(router));
        vault.setSupportedToken(address(usdc), true);
        vault.setERCToken(address(usdc), address(eUSDC));
        
        // Configure router (vault calls this)
        vm.stopPrank();
        vm.prank(address(vault));
        router.setERCToken(address(usdc), address(eUSDC));
        vm.startPrank(owner);
        
        // Mint tokens to users
        usdc.mint(user1, 1000e6);
        usdc.mint(user2, 1000e6);
        
        vm.stopPrank();
    }

    function test_VaultCanMintAndBurn() public {
        vm.startPrank(address(vault));
        
        // Mint tokens
        eUSDC.mint(user1, 100e6);
        assertEq(eUSDC.balanceOf(user1), 100e6);
        assertEq(eUSDC.totalSupply(), 100e6);
        
        // Burn tokens
        eUSDC.burn(user1, 50e6);
        assertEq(eUSDC.balanceOf(user1), 50e6);
        assertEq(eUSDC.totalSupply(), 50e6);
        
        vm.stopPrank();
    }

    function test_RevertWhen_NonVaultMint() public {
        vm.startPrank(user1);
        vm.expectRevert(eERC.NotVault.selector);
        eUSDC.mint(user1, 100e6);
        vm.stopPrank();
    }

    function test_RevertWhen_NonVaultBurn() public {
        vm.startPrank(address(vault));
        eUSDC.mint(user1, 100e6);
        vm.stopPrank();
        
        vm.startPrank(user1);
        vm.expectRevert(eERC.NotVault.selector);
        eUSDC.burn(user1, 50e6);
        vm.stopPrank();
    }

    function test_VaultTransfer() public {
        vm.startPrank(address(vault));
        
        // Mint tokens to user1
        eUSDC.mint(user1, 100e6);
        assertEq(eUSDC.balanceOf(user1), 100e6);
        
        // Transfer from user1 to user2
        eUSDC.vaultTransfer(user1, user2, 50e6);
        assertEq(eUSDC.balanceOf(user1), 50e6);
        assertEq(eUSDC.balanceOf(user2), 50e6);
        
        vm.stopPrank();
    }

    function test_RouterTransfer() public {
        vm.startPrank(address(vault));
        eUSDC.mint(user1, 100e6);
        vm.stopPrank();
        
        vm.startPrank(address(router));
        
        // Transfer from user1 to user2
        eUSDC.routerTransfer(user1, user2, 50e6);
        assertEq(eUSDC.balanceOf(user1), 50e6);
        assertEq(eUSDC.balanceOf(user2), 50e6);
        
        vm.stopPrank();
    }

    function test_RouterTransferFrom() public {
        vm.startPrank(address(vault));
        eUSDC.mint(user1, 100e6);
        vm.stopPrank();
        
        // User1 approves router
        vm.startPrank(user1);
        eUSDC.approve(address(router), 50e6);
        vm.stopPrank();
        
        vm.startPrank(address(router));
        
        // Transfer from user1 to user2 with allowance
        eUSDC.routerTransferFrom(user1, user2, 50e6);
        assertEq(eUSDC.balanceOf(user1), 50e6);
        assertEq(eUSDC.balanceOf(user2), 50e6);
        assertEq(eUSDC.allowance(user1, address(router)), 0);
        
        vm.stopPrank();
    }

    function test_RevertWhen_UnauthorizedVaultTransfer() public {
        vm.startPrank(address(vault));
        eUSDC.mint(user1, 100e6);
        vm.stopPrank();
        
        vm.startPrank(unauthorized);
        vm.expectRevert(eERC.NotVault.selector);
        eUSDC.vaultTransfer(user1, user2, 50e6);
        vm.stopPrank();
    }

    function test_RevertWhen_UnauthorizedRouterTransfer() public {
        vm.startPrank(address(vault));
        eUSDC.mint(user1, 100e6);
        vm.stopPrank();
        
        vm.startPrank(unauthorized);
        vm.expectRevert(eERC.NotRouter.selector);
        eUSDC.routerTransfer(user1, user2, 50e6);
        vm.stopPrank();
    }

    function test_RevertWhen_InsufficientBalance() public {
        vm.startPrank(address(vault));
        eUSDC.mint(user1, 50e6);
        vm.stopPrank();
        
        vm.startPrank(address(router));
        vm.expectRevert(eERC.InsufficientBalance.selector);
        eUSDC.routerTransfer(user1, user2, 100e6);
        vm.stopPrank();
    }

    function test_RevertWhen_InsufficientAllowance() public {
        vm.startPrank(address(vault));
        eUSDC.mint(user1, 100e6);
        vm.stopPrank();
        
        vm.startPrank(address(router));
        vm.expectRevert(eERC.InsufficientAllowance.selector);
        eUSDC.routerTransferFrom(user1, user2, 50e6);
        vm.stopPrank();
    }

    function test_DirectTransfersStillDisabled() public {
        vm.startPrank(address(vault));
        eUSDC.mint(user1, 100e6);
        vm.stopPrank();
        
        vm.startPrank(user1);
        vm.expectRevert(eERC.TransfersDisabled.selector);
        eUSDC.transfer(user2, 50e6);
        
        vm.expectRevert(eERC.TransfersDisabled.selector);
        eUSDC.transferFrom(user1, user2, 50e6);
        vm.stopPrank();
    }

    function test_EventsEmitted() public {
        vm.startPrank(address(vault));
        eUSDC.mint(user1, 100e6);
        vm.stopPrank();
        
        // Test vault transfer event
        vm.startPrank(address(vault));
        vm.expectEmit(true, true, false, true);
        emit IeERC.Transfer(user1, user2, 50e6);
        eUSDC.vaultTransfer(user1, user2, 50e6);
        vm.stopPrank();
        
        // Test router transfer event
        vm.startPrank(address(router));
        vm.expectEmit(true, true, false, true);
        emit IeERC.Transfer(user2, user1, 25e6);
        eUSDC.routerTransfer(user2, user1, 25e6);
        vm.stopPrank();
    }
}
