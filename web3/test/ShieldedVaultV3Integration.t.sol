// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {IShieldedVault} from "../src/interfaces/IShieldedVault.sol";
import {PrivacyV3Router} from "../src/PrivacyV3Router.sol";
import {ComplianceOracleChainlink} from "../src/oracle/ComplianceOracleChainlink.sol";
import {IncrementalMerkleTree} from "../src/libraries/IncrementalMerkleTree.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

// Mock ERC20 for testing
contract MockERC20 is IERC20 {
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;
    uint256 public override totalSupply;
    string public name;
    string public symbol;
    uint8 public decimals;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}

contract ShieldedVaultV3IntegrationTest is Test {
    ShieldedVault public vault;
    PrivacyV3Router public router;
    ComplianceOracleChainlink public compliance;
    MockERC20 public usdc;
    MockERC20 public wavax;

    address public constant OWNER = address(0x1);
    address public constant USER = address(0x2);
    bytes32 public constant TEST_ROOT = bytes32(uint256(0x123));
    bytes32 public constant TEST_NULLIFIER = bytes32(uint256(0x456));
    bytes public constant TEST_PROOF = hex"deadbeef";

    event CommitmentInserted(bytes32 indexed commitment, uint32 index, bytes32 newRoot);
    event NullifierUsed(bytes32 indexed nullifier);
    event SpendAccepted(bytes32 indexed nullifier, address indexed tokenIn, uint256 amountIn);

    function setUp() public {
        vm.startPrank(OWNER);

        // Deploy tokens
        usdc = new MockERC20("USDC", "USDC", 6);
        wavax = new MockERC20("WAVAX", "WAVAX", 18);

        // Deploy contracts
        compliance = new ComplianceOracleChainlink();
        vault = new ShieldedVault(address(compliance));
        router = new PrivacyV3Router(address(vault));

        // Configure vault
        vault.setRouter(address(router));
        vault.setSupportedToken(address(usdc), true);
        vault.setSupportedToken(address(wavax), true);

        // Set up denominations for testing
        uint256[] memory denominations = new uint256[](3);
        denominations[0] = 1000e6;   // 1000 USDC
        denominations[1] = 5000e6;   // 5000 USDC
        denominations[2] = 10000e6;  // 10000 USDC
        vault.setDenominations(address(usdc), denominations);

        uint256[] memory avaxDenominations = new uint256[](3);
        avaxDenominations[0] = 1e18;   // 1 AVAX
        avaxDenominations[1] = 10e18;  // 10 AVAX
        avaxDenominations[2] = 100e18; // 100 AVAX
        vault.setDenominations(address(wavax), avaxDenominations);

        // Mint tokens to vault for spend operations
        usdc.mint(address(vault), 100000e6);  // 100k USDC
        wavax.mint(address(vault), 10000e18);  // 10k WAVAX

        vm.stopPrank();
    }

    function testVaultBasicSetup() public {
        // Test initial setup
        assertEq(vault.router(), address(router));
        assertEq(address(vault.complianceOracle()), address(compliance));
        assertTrue(vault.supportedToken(address(usdc)));
        assertTrue(vault.supportedToken(address(wavax)));

        // Test owner controls
        assertEq(vault.owner(), OWNER);

        // Test denominations (note: can't easily test array length in mapping without getter)
    }

    function testMerkleTreeIntegration() public {
        bytes32 currentRoot = vault.latestRoot();
        assertTrue(currentRoot != bytes32(0));

        // The root should be the initial root from the Merkle tree
        uint256 treeRoot = vault.merkleTree().latestRoot();
        assertEq(currentRoot, bytes32(treeRoot));
    }

    function testExecuteSpendFromRouter() public {
        uint256 amountIn = 1000e6; // 1000 USDC
        uint256 initialVaultBalance = usdc.balanceOf(address(vault));
        uint256 initialRouterBalance = usdc.balanceOf(address(router));

        // Mock that the root is valid
        vm.mockCall(
            address(vault.merkleTree()),
            abi.encodeWithSignature("isKnownRoot(uint256)", uint256(TEST_ROOT)),
            abi.encode(true)
        );

        // Expect events
        vm.expectEmit(true, false, false, true);
        emit NullifierUsed(TEST_NULLIFIER);

        vm.expectEmit(true, true, false, true);
        emit SpendAccepted(TEST_NULLIFIER, address(usdc), amountIn);

        // Execute spend from router
        vm.prank(address(router));
        uint256 amountOut = vault.executeSpend(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            amountIn,
            0
        );

        // Check state changes
        assertTrue(vault.nullifierUsed(TEST_NULLIFIER));
        assertEq(usdc.balanceOf(address(vault)), initialVaultBalance - amountIn);
        assertEq(usdc.balanceOf(address(router)), initialRouterBalance + amountIn);

        // Currently returns 0 for MVP testing (as noted in implementation)
        assertEq(amountOut, 0);
    }

    function testExecuteSpendAccessControl() public {
        // Only router should be able to call executeSpend
        vm.prank(USER);
        vm.expectRevert(ShieldedVault.NotRouter.selector);
        vault.executeSpend(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            1000e6,
            0
        );

        // Router should be able to call
        vm.mockCall(
            address(vault.merkleTree()),
            abi.encodeWithSignature("isKnownRoot(uint256)", uint256(TEST_ROOT)),
            abi.encode(true)
        );

        vm.prank(address(router));
        vault.executeSpend(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            1000e6,
            0
        );
    }

    function testExecuteSpendWithInvalidRoot() public {
        bytes32 invalidRoot = bytes32(uint256(0x999));

        // Mock that the invalid root is not known
        vm.mockCall(
            address(vault.merkleTree()),
            abi.encodeWithSignature("isKnownRoot(uint256)", uint256(invalidRoot)),
            abi.encode(false)
        );

        vm.prank(address(router));
        vm.expectRevert(IShieldedVault.InvalidRoot.selector);
        vault.executeSpend(
            TEST_PROOF,
            invalidRoot,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            1000e6,
            0
        );
    }

    function testExecuteSpendWithUsedNullifier() public {
        // First spend succeeds
        vm.mockCall(
            address(vault.merkleTree()),
            abi.encodeWithSignature("isKnownRoot(uint256)", uint256(TEST_ROOT)),
            abi.encode(true)
        );

        vm.prank(address(router));
        vault.executeSpend(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            1000e6,
            0
        );

        // Second spend with same nullifier should fail
        vm.prank(address(router));
        vm.expectRevert(IShieldedVault.NullifierAlreadyUsed.selector);
        vault.executeSpend(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            1000e6,
            0
        );
    }

    function testExecuteSpendWithUnsupportedToken() public {
        // Deploy new token that's not supported
        MockERC20 newToken = new MockERC20("NEW", "NEW", 18);

        vm.mockCall(
            address(vault.merkleTree()),
            abi.encodeWithSignature("isKnownRoot(uint256)", uint256(TEST_ROOT)),
            abi.encode(true)
        );

        vm.prank(address(router));
        vm.expectRevert(IShieldedVault.Unauthorized.selector);
        vault.executeSpend(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(newToken), // Unsupported token
            address(wavax),
            1000e6,
            0
        );
    }

    function testPausability() public {
        // Pause vault
        vm.prank(OWNER);
        vault.pause();

        // Mock valid root
        vm.mockCall(
            address(vault.merkleTree()),
            abi.encodeWithSignature("isKnownRoot(uint256)", uint256(TEST_ROOT)),
            abi.encode(true)
        );

        // Should revert when paused
        vm.prank(address(router));
        vm.expectRevert(); // Pausable revert
        vault.executeSpend(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            1000e6,
            0
        );

        // Unpause and try again
        vm.prank(OWNER);
        vault.unpause();

        vm.prank(address(router));
        vault.executeSpend(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            1000e6,
            0
        );
    }

    function testOwnershipFunctions() public {
        // Test setting router
        vm.prank(OWNER);
        vault.setRouter(address(0x123));
        assertEq(vault.router(), address(0x123));

        // Test setting compliance oracle
        ComplianceOracleChainlink newCompliance = new ComplianceOracleChainlink();
        vm.prank(OWNER);
        vault.setComplianceOracle(address(newCompliance));
        assertEq(address(vault.complianceOracle()), address(newCompliance));

        // Test setting supported tokens
        vm.prank(OWNER);
        vault.setSupportedToken(address(usdc), false);
        assertFalse(vault.supportedToken(address(usdc)));

        // Test setting denominations
        uint256[] memory newDenoms = new uint256[](2);
        newDenoms[0] = 2000e6;
        newDenoms[1] = 8000e6;

        vm.prank(OWNER);
        vault.setDenominations(address(usdc), newDenoms);

        // Note: tokenDenominations mapping cannot be directly accessed as array
        // This would require a getter function to test properly

        // Test ownership transfer
        vm.prank(OWNER);
        vault.transferOwnership(USER);

        // New owner should be able to modify
        vm.prank(USER);
        vault.setRouter(address(0x456));
        assertEq(vault.router(), address(0x456));

        // Old owner should not be able to modify
        vm.prank(OWNER);
        vm.expectRevert();
        vault.setRouter(address(0x789));
    }

    function testNonOwnerAccessControl() public {
        // Non-owners should not be able to call owner functions
        vm.prank(USER);
        vm.expectRevert();
        vault.setRouter(address(0x123));

        vm.prank(USER);
        vm.expectRevert();
        vault.setComplianceOracle(address(0x123));

        vm.prank(USER);
        vm.expectRevert();
        vault.setSupportedToken(address(usdc), false);

        uint256[] memory newDenoms = new uint256[](1);
        newDenoms[0] = 1000e6;

        vm.prank(USER);
        vm.expectRevert();
        vault.setDenominations(address(usdc), newDenoms);

        vm.prank(USER);
        vm.expectRevert();
        vault.transferOwnership(USER);
    }

    function testVaultTokenBalances() public {
        // Check initial balances
        assertEq(usdc.balanceOf(address(vault)), 100000e6);
        assertEq(wavax.balanceOf(address(vault)), 10000e18);

        // After a spend, vault balance should decrease
        vm.mockCall(
            address(vault.merkleTree()),
            abi.encodeWithSignature("isKnownRoot(uint256)", uint256(TEST_ROOT)),
            abi.encode(true)
        );

        uint256 spendAmount = 5000e6;

        vm.prank(address(router));
        vault.executeSpend(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            spendAmount,
            0
        );

        assertEq(usdc.balanceOf(address(vault)), 100000e6 - spendAmount);
    }
}