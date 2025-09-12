// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {PrivacyRouter} from "../src/PrivacyRouter.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {eERC} from "../src/token/eERC.sol";
import {ComplianceOracleStub} from "../src/oracle/ComplianceOracleStub.sol";
import {MockVerifier} from "../src/mocks/MockVerifier.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {StealthAddress} from "../src/libraries/StealthAddress.sol";

contract StealthAddressIntegrationTest is Test {
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
        
        // Configure router
        vm.stopPrank();
        vm.prank(address(vault));
        router.setERCToken(address(usdc), address(eUSDC));
        router.setERCToken(address(dai), address(eDAI));
        vm.startPrank(owner);
        
        // Mint tokens
        usdc.mint(user, 1000e6);
        dai.mint(address(vault), 1000e18);
        
        vm.stopPrank();
    }

    function test_SimpleStealthAddressSwap() public {
        // Generate simple stealth data
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.SIMPLE,
            42
        );
        
        // Verify stealth data
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.SIMPLE));
        
        // Perform deposit
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        bytes32 commitment = keccak256("note");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        vm.stopPrank();
        
        // Perform private swap with simple stealth address
        vm.startPrank(user);
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier");
        
        uint256 amountOut = router.spendAndSwap(
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
        
        // Verify swap completed
        assertEq(amountOut, 50e6);
        assertEq(eUSDC.balanceOf(user), 50e6); // 50e6 remaining
        assertEq(eDAI.balanceOf(recipient), 50e18); // 50e18 minted to recipient
        
        vm.stopPrank();
    }

    function test_PoseidonHashStealthAddressSwap() public {
        // Generate Poseidon hash stealth data
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.POSEIDON_HASH,
            123
        );
        
        // Verify stealth data
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.POSEIDON_HASH));
        
        // Perform deposit
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        bytes32 commitment = keccak256("note2");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        vm.stopPrank();
        
        // Perform private swap with Poseidon hash stealth address
        vm.startPrank(user);
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier2");
        
        uint256 amountOut = router.spendAndSwap(
            hex"1234",
            root,
            nullifier,
            address(usdc),
            address(dai),
            75e6,
            70e18,
            stealthData,
            block.timestamp + 3600
        );
        
        // Verify swap completed
        assertEq(amountOut, 75e6);
        assertEq(eUSDC.balanceOf(user), 25e6); // 25e6 remaining
        assertEq(eDAI.balanceOf(recipient), 75e18); // 75e18 minted to recipient
        
        vm.stopPrank();
    }

    function test_ECDSAStealthAddressSwap() public {
        // Generate ECDSA stealth data
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.ECDSA_STEALTH,
            456
        );
        
        // Verify stealth data
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.ECDSA_STEALTH));
        
        // Perform deposit
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        bytes32 commitment = keccak256("note3");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        vm.stopPrank();
        
        // Perform private swap with ECDSA stealth address
        vm.startPrank(user);
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier3");
        
        uint256 amountOut = router.spendAndSwap(
            hex"1234",
            root,
            nullifier,
            address(usdc),
            address(dai),
            30e6,
            25e18,
            stealthData,
            block.timestamp + 3600
        );
        
        // Verify swap completed
        assertEq(amountOut, 30e6);
        assertEq(eUSDC.balanceOf(user), 70e6); // 70e6 remaining
        assertEq(eDAI.balanceOf(recipient), 30e18); // 30e18 minted to recipient
        
        vm.stopPrank();
    }

    function test_SemaphoreStyleStealthAddressSwap() public {
        // Generate Semaphore-style stealth data
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.SEMAPHORE_STYLE,
            789
        );
        
        // Verify stealth data
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.SEMAPHORE_STYLE));
        
        // Perform deposit
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        bytes32 commitment = keccak256("note4");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        vm.stopPrank();
        
        // Perform private swap with Semaphore-style stealth address
        vm.startPrank(user);
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier4");
        
        uint256 amountOut = router.spendAndSwap(
            hex"1234",
            root,
            nullifier,
            address(usdc),
            address(dai),
            20e6,
            15e18,
            stealthData,
            block.timestamp + 3600
        );
        
        // Verify swap completed
        assertEq(amountOut, 20e6);
        assertEq(eUSDC.balanceOf(user), 80e6); // 80e6 remaining
        assertEq(eDAI.balanceOf(recipient), 20e18); // 20e18 minted to recipient
        
        vm.stopPrank();
    }

    function test_CustomEncodedStealthAddressSwap() public {
        // Generate custom encoded stealth data
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.CUSTOM_ENCODED,
            999
        );
        
        // Verify stealth data
        assertTrue(StealthAddress.isValidStealthData(stealthData, StealthAddress.StealthScheme.CUSTOM_ENCODED));
        
        // Perform deposit
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        bytes32 commitment = keccak256("note5");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        vm.stopPrank();
        
        // Perform private swap with custom encoded stealth address
        vm.startPrank(user);
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier5");
        
        uint256 amountOut = router.spendAndSwap(
            hex"1234",
            root,
            nullifier,
            address(usdc),
            address(dai),
            10e6,
            5e18,
            stealthData,
            block.timestamp + 3600
        );
        
        // Verify swap completed
        assertEq(amountOut, 10e6);
        assertEq(eUSDC.balanceOf(user), 90e6); // 90e6 remaining
        assertEq(eDAI.balanceOf(recipient), 10e18); // 10e18 minted to recipient
        
        vm.stopPrank();
    }

    function test_StealthAddressValidation() public {
        // Test router stealth address validation functions
        bytes memory stealthData = StealthAddress.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.SIMPLE,
            42
        );
        
        // Test isValidStealthData
        assertTrue(router.isValidStealthData(stealthData, StealthAddress.StealthScheme.SIMPLE));
        assertFalse(router.isValidStealthData(stealthData, StealthAddress.StealthScheme.POSEIDON_HASH));
        
        // Test getStealthScheme
        StealthAddress.StealthScheme scheme = router.getStealthScheme(stealthData);
        assertEq(uint8(scheme), uint8(StealthAddress.StealthScheme.SIMPLE));
        
        // Test generateStealthData
        bytes memory generatedData = router.generateStealthData(
            recipient,
            StealthAddress.StealthScheme.POSEIDON_HASH,
            123
        );
        assertTrue(router.isValidStealthData(generatedData, StealthAddress.StealthScheme.POSEIDON_HASH));
    }

    function test_InvalidStealthDataReverts() public {
        // Test with invalid stealth data
        bytes memory invalidData = abi.encodePacked(uint8(255)); // Invalid scheme
        
        vm.startPrank(user);
        usdc.approve(address(vault), 100e6);
        bytes32 commitment = keccak256("note");
        uint[2] memory _pA = [uint(1), uint(2)];
        uint[2][2] memory _pB = [[uint(3), uint(4)], [uint(5), uint(6)]];
        uint[2] memory _pC = [uint(7), uint(8)];
        vault.deposit(address(usdc), 100e6, commitment, 0, _pA, _pB, _pC);
        vm.stopPrank();
        
        vm.startPrank(user);
        bytes32 root = vault.latestRoot();
        bytes32 nullifier = keccak256("nullifier");
        
        vm.expectRevert(PrivacyRouter.StealthResolutionFailed.selector);
        router.spendAndSwap(
            hex"1234",
            root,
            nullifier,
            address(usdc),
            address(dai),
            50e6,
            45e18,
            invalidData,
            block.timestamp + 3600
        );
        
        vm.stopPrank();
    }

    function test_CommitmentVerification() public {
        // Test commitment generation and verification
        bytes32 commitment = StealthAddress.generateCommitment(recipient, 42);
        assertTrue(commitment != bytes32(0));
        
        // Test valid commitment
        assertTrue(StealthAddress.verifyCommitment(recipient, 42, commitment));
        
        // Test invalid commitment
        assertFalse(StealthAddress.verifyCommitment(recipient, 43, commitment));
        assertFalse(StealthAddress.verifyCommitment(address(0x123), 42, commitment));
    }
}
