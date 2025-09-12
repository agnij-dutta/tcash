// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {eERC} from "../src/token/eERC.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {PrivacyRouter} from "../src/PrivacyRouter.sol";
import {IPrivacyRouter} from "../src/interfaces/IPrivacyRouter.sol";
import {ComplianceOracleStub} from "../src/oracle/ComplianceOracleStub.sol";
import {MockVerifier} from "../src/mocks/MockVerifier.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract PrivateSwapIntegrationTest is Test {
    eERC eUSDC;
    eERC eDAI;
    ShieldedVault vault;
    PrivacyRouter router;
    ComplianceOracleStub oracle;
    MockVerifier verifier;
    MockERC20 usdc;
    MockERC20 dai;
    
    address owner = address(0x1);
    address user = address(0x2);
    address recipient = address(0x3);

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts
        oracle = new ComplianceOracleStub();
        verifier = new MockVerifier(true);
        vault = new ShieldedVault(address(oracle), address(verifier));
        router = new PrivacyRouter(address(vault));
        usdc = new MockERC20("USDC", "USDC");
        dai = new MockERC20("DAI", "DAI");
        
        // Deploy eERC tokens
        eUSDC = new eERC("eUSDC", "eUSDC", address(vault), address(router));
        eDAI = new eERC("eDAI", "eDAI", address(vault), address(router));
        
        // Configure vault
        vault.setRouter(address(router));
        vault.setSupportedToken(address(usdc), true);
        vault.setSupportedToken(address(dai), true);
        vault.setERCToken(address(usdc), address(eUSDC));
        vault.setERCToken(address(dai), address(eDAI));
        
        // Configure router (vault calls this)
        vm.stopPrank();
        vm.prank(address(vault));
        router.setERCToken(address(usdc), address(eUSDC));
        router.setERCToken(address(dai), address(eDAI));
        vm.startPrank(owner);
        
        // Mint tokens to user
        usdc.mint(user, 1000e6);
        dai.mint(address(vault), 1000e18); // Vault needs DAI for swaps
        
        vm.stopPrank();
    }

    function test_CompleteDepositFlow() public {
        vm.startPrank(user);
        
        // Approve vault to spend USDC
        usdc.approve(address(vault), 100e6);
        
        // Deposit USDC (with mock proof)
        bytes32 commitment = keccak256("note");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        
        // Check balances
        assertEq(usdc.balanceOf(user), 900e6);
        assertEq(usdc.balanceOf(address(vault)), 100e6);
        assertEq(eUSDC.balanceOf(user), 100e6);
        assertEq(eUSDC.totalSupply(), 100e6);
        
        vm.stopPrank();
    }

    function test_CompleteWithdrawFlow() public {
        // First deposit
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        bytes32 commitment = keccak256("note");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        vm.stopPrank();
        
        // Now withdraw
        vm.startPrank(user);
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier");
        
        vault.withdraw(
            hex"1234", // mock proof
            root,
            nullifier,
            address(usdc),
            50e6,
            recipient
        );
        
        // Check balances
        assertEq(usdc.balanceOf(user), 900e6);
        assertEq(usdc.balanceOf(recipient), 50e6);
        assertEq(usdc.balanceOf(address(vault)), 50e6);
        assertEq(eUSDC.balanceOf(user), 50e6); // eUSDC burned
        assertEq(eUSDC.totalSupply(), 50e6);
        
        vm.stopPrank();
    }

    function test_PrivateSwapFlow() public {
        // First deposit USDC
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        bytes32 commitment = keccak256("note");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        vm.stopPrank();
        
        // Now perform private swap
        vm.startPrank(user);
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier");
        bytes memory stealthData = abi.encodePacked(recipient); // Simple stealth data
        
        uint256 amountOut = router.spendAndSwap(
            hex"1234", // mock proof
            root,
            nullifier,
            address(usdc),
            address(dai),
            50e6,
            45e18, // min amount out
            stealthData,
            block.timestamp + 3600 // 1 hour deadline
        );
        
        // Check balances after swap
        assertEq(usdc.balanceOf(user), 900e6);
        assertEq(usdc.balanceOf(address(vault)), 50e6); // 50e6 USDC spent
        assertEq(eUSDC.balanceOf(user), 50e6); // 50e6 eUSDC remaining
        assertEq(eDAI.balanceOf(recipient), 50e18); // 50e18 eDAI minted to recipient
        assertEq(amountOut, 50e6); // Mock 1:1 swap rate
        
        vm.stopPrank();
    }

    function test_RevertWhen_UnsupportedToken() public {
        vm.startPrank(user);
        
        // Try to swap with unsupported token
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier");
        bytes memory stealthData = abi.encodePacked(recipient);
        
        vm.expectRevert(PrivacyRouter.UnsupportedToken.selector);
        router.spendAndSwap(
            hex"1234",
            root,
            nullifier,
            address(0x123), // Unsupported token
            address(dai),
            50e6,
            45e18,
            stealthData,
            block.timestamp + 3600
        );
        
        vm.stopPrank();
    }

    function test_RevertWhen_SlippageExceeded() public {
        vm.startPrank(user);
        
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier");
        bytes memory stealthData = abi.encodePacked(recipient);
        
        vm.expectRevert(IPrivacyRouter.SlippageExceeded.selector);
        router.spendAndSwap(
            hex"1234",
            root,
            nullifier,
            address(usdc),
            address(dai),
            50e6,
            45e18,
            stealthData,
            block.timestamp - 1 // Expired deadline
        );
        
        vm.stopPrank();
    }

    function test_EventsEmitted() public {
        // Deposit first
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        bytes32 commitment = keccak256("note");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        vm.stopPrank();
        
        // Test private swap event
        vm.startPrank(user);
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier");
        bytes memory stealthData = abi.encodePacked(recipient);
        
        vm.expectEmit(true, true, true, true);
        emit PrivacyRouter.PrivateSwapExecuted(
            user,
            recipient,
            address(usdc),
            address(dai),
            50e6,
            50e6
        );
        
        router.spendAndSwap(
            hex"1234",
            root,
            nullifier,
            address(usdc),
            address(dai),
            50e6,
            45e18,
            stealthData,
            block.timestamp + 3600
        );
        
        vm.stopPrank();
    }
}
