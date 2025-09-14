// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PrivacyV3Router} from "../src/PrivacyV3Router.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {ComplianceOracleChainlink} from "../src/oracle/ComplianceOracleChainlink.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

// Simple test token
contract TestToken is IERC20 {
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

// Minimal EERC Converter mock
contract TestEERCConverter {
    mapping(address => uint256) public tokenBalances;

    event Deposit(address indexed token, uint256 amount, bytes encryptedData);
    event Withdraw(address indexed token, uint256 amount, address indexed recipient);

    function deposit(address token, uint256 amount, bytes calldata encryptedData) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        tokenBalances[token] += amount;
        emit Deposit(token, amount, encryptedData);
    }

    function withdraw(address token, uint256 amount, address recipient, bytes calldata) external {
        require(tokenBalances[token] >= amount, "Insufficient converter balance");
        tokenBalances[token] -= amount;
        IERC20(token).transfer(recipient, amount);
        emit Withdraw(token, amount, recipient);
    }
}

// Simplified V3 Pool for testing
contract TestV3Pool {
    address public token0;
    address public token1;
    uint24 public fee;

    constructor(address _token0, address _token1, uint24 _fee) {
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
    }

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1) {
        require(amountSpecified > 0, "Invalid amount");

        uint256 amountIn = uint256(amountSpecified);
        // Simple 1:1 exchange rate for testing
        uint256 amountOut = amountIn;

        if (zeroForOne) {
            amount0 = int256(amountIn);   // We owe token0
            amount1 = -int256(amountOut); // We receive token1
        } else {
            amount0 = -int256(amountOut); // We receive token0
            amount1 = int256(amountIn);   // We owe token1
        }

        // Callback for settlement
        PrivacyV3Router(payable(msg.sender)).uniswapV3SwapCallback(amount0, amount1, data);

        // Send output tokens
        address tokenOut = zeroForOne ? token1 : token0;
        IERC20(tokenOut).transfer(recipient, amountOut);
    }
}

contract EndToEndV3SwapTest is Test {
    PrivacyV3Router public router;
    ShieldedVault public vault;
    ComplianceOracleChainlink public compliance;
    TestEERCConverter public converter;

    TestToken public tokenA;
    TestToken public tokenB;
    TestV3Pool public pool;

    address public constant USER = address(0x1);
    address public constant RECIPIENT = address(0x2);

    // Test data
    bytes32 public constant TEST_ROOT = bytes32(uint256(0x123456789));
    bytes32 public constant TEST_NULLIFIER = bytes32(uint256(0x987654321));
    bytes public constant TEST_PROOF = hex"deadbeef";
    bytes public constant ENCRYPTED_RECIPIENT = hex"656e637279707465646461746162";

    function setUp() public {
        // Deploy tokens
        tokenA = new TestToken("TokenA", "TKA", 18);
        tokenB = new TestToken("TokenB", "TKB", 18);

        // Ensure token0 < token1 for pool creation
        if (address(tokenA) > address(tokenB)) {
            (tokenA, tokenB) = (tokenB, tokenA);
        }

        // Deploy core contracts
        compliance = new ComplianceOracleChainlink();
        vault = new ShieldedVault(address(compliance));
        converter = new TestEERCConverter();
        router = new PrivacyV3Router(address(vault));

        // Create test pool
        pool = new TestV3Pool(address(tokenA), address(tokenB), 3000);

        // Setup relationships
        vault.setRouter(address(router));
        router.setConverter(address(converter));
        router.setCompliance(address(compliance));

        // Configure supported tokens
        vault.setSupportedToken(address(tokenA), true);
        vault.setSupportedToken(address(tokenB), true);

        // Setup initial balances
        tokenA.mint(address(vault), 1000000e18);  // 1M tokens in vault
        tokenB.mint(address(pool), 1000000e18);   // 1M tokens in pool for swaps

        // Mock valid Merkle root
        vm.mockCall(
            address(vault.merkleTree()),
            abi.encodeWithSignature("isKnownRoot(uint256)", uint256(TEST_ROOT)),
            abi.encode(true)
        );

        // Mock Uniswap V3 factory to return our test pool
        vm.mockCall(
            0x1F98431c8aD98523631AE4a59f267346ea31F984, // Fuji V3 Factory
            abi.encodeWithSignature("getPool(address,address,uint24)",
                address(tokenA), address(tokenB), uint24(3000)),
            abi.encode(address(pool))
        );

        // Mock quoter for price quotes
        vm.mockCall(
            0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6, // Fuji V3 Quoter
            abi.encodeWithSignature("quoteExactInputSingle(address,address,uint24,uint256,uint160)",
                address(tokenA), address(tokenB), uint24(3000), 1000e18, uint160(0)),
            abi.encode(1000e18) // 1:1 exchange rate
        );
    }

    function testCompleteSwapFlow() public {
        uint256 amountIn = 1000e18;
        uint256 minAmountOut = 900e18; // 10% slippage tolerance
        uint256 deadline = block.timestamp + 300;

        // Check initial balances
        uint256 vaultBalanceBefore = tokenA.balanceOf(address(vault));
        uint256 converterBalanceBefore = tokenB.balanceOf(address(converter));

        console.log("=== Initial State ===");
        console.log("Vault TokenA balance:", vaultBalanceBefore);
        console.log("Converter TokenB balance:", converterBalanceBefore);

        // Execute the complete swap flow
        vm.prank(USER);
        uint256 amountOut = router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(tokenA),
            address(tokenB),
            amountIn,
            minAmountOut,
            3000,
            ENCRYPTED_RECIPIENT,
            deadline
        );

        console.log("=== After Swap ===");
        console.log("Amount out:", amountOut);

        // Verify the complete flow
        // 1. Vault should have transferred tokens to router (via callback)
        uint256 vaultBalanceAfter = tokenA.balanceOf(address(vault));
        assertEq(vaultBalanceAfter, vaultBalanceBefore - amountIn, "Vault balance should decrease");

        // 2. Router should have no remaining tokens (all swapped and deposited)
        assertEq(tokenA.balanceOf(address(router)), 0, "Router should have no TokenA left");
        assertEq(tokenB.balanceOf(address(router)), 0, "Router should have no TokenB left");

        // 3. Converter should have received the swapped tokens
        uint256 converterBalanceAfter = tokenB.balanceOf(address(converter));
        assertEq(converterBalanceAfter, converterBalanceBefore + amountOut, "Converter should receive TokenB");

        // 4. Nullifier should be marked as used
        assertTrue(vault.nullifierUsed(TEST_NULLIFIER), "Nullifier should be used");

        // 5. Amount out should meet minimum requirement
        assertGe(amountOut, minAmountOut, "Amount out should meet minimum");

        console.log("Vault TokenA after:", vaultBalanceAfter);
        console.log("Converter TokenB after:", converterBalanceAfter);
    }

    function testCompleteSwapFlowWithInterfaceFunction() public {
        uint256 amountIn = 500e18;
        uint256 minAmountOut = 450e18;
        uint256 deadline = block.timestamp + 300;

        // Use different nullifier
        bytes32 nullifier2 = bytes32(uint256(0x111222333));

        // Mock quoter for this amount
        vm.mockCall(
            0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6,
            abi.encodeWithSignature("quoteExactInputSingle(address,address,uint24,uint256,uint160)",
                address(tokenA), address(tokenB), uint24(3000), amountIn, uint160(0)),
            abi.encode(amountIn)
        );

        uint256 vaultBalanceBefore = tokenA.balanceOf(address(vault));

        // Use the interface-compliant function (automatically uses 0.3% fee)
        vm.prank(USER);
        uint256 amountOut = router.spendSwapAndDeposit(
            TEST_PROOF,
            TEST_ROOT,
            nullifier2,
            address(tokenA),
            address(tokenB),
            amountIn,
            minAmountOut,
            ENCRYPTED_RECIPIENT,
            deadline
        );

        // Verify results
        assertEq(tokenA.balanceOf(address(vault)), vaultBalanceBefore - amountIn);
        assertTrue(vault.nullifierUsed(nullifier2));
        assertGe(amountOut, minAmountOut);
    }

    function testSwapWithRealLifeScenario() public {
        // Scenario: User wants to swap 10,000 TokenA for TokenB with 2% slippage
        uint256 amountIn = 10000e18;
        uint256 expectedOut = 10000e18; // 1:1 rate
        uint256 slippage = 2; // 2%
        uint256 minAmountOut = (expectedOut * (100 - slippage)) / 100; // 9,800 tokens
        uint256 deadline = block.timestamp + 600; // 10 minutes

        bytes32 userNullifier = keccak256(abi.encodePacked("user_transaction_1"));

        // Mock quoter for this scenario
        vm.mockCall(
            0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6,
            abi.encodeWithSignature("quoteExactInputSingle(address,address,uint24,uint256,uint160)",
                address(tokenA), address(tokenB), uint24(3000), amountIn, uint160(0)),
            abi.encode(expectedOut)
        );

        // Record initial state
        uint256 initialVaultBalance = tokenA.balanceOf(address(vault));
        uint256 initialConverterBalance = tokenB.balanceOf(address(converter));

        console.log("=== Real Life Scenario ===");
        console.log("Swapping:", amountIn, "TokenA");
        console.log("Expected out:", expectedOut, "TokenB");
        console.log("Min acceptable:", minAmountOut, "TokenB");

        // Execute swap
        vm.prank(USER);
        uint256 actualAmountOut = router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            userNullifier,
            address(tokenA),
            address(tokenB),
            amountIn,
            minAmountOut,
            3000, // 0.3% fee
            ENCRYPTED_RECIPIENT,
            deadline
        );

        console.log("Actual amount out:", actualAmountOut);

        // Verify successful execution
        assertTrue(actualAmountOut >= minAmountOut, "Slippage protection violated");
        assertEq(tokenA.balanceOf(address(vault)), initialVaultBalance - amountIn, "Vault balance incorrect");
        assertEq(tokenB.balanceOf(address(converter)), initialConverterBalance + actualAmountOut, "Converter balance incorrect");

        console.log("Swap completed successfully within slippage limits");
    }

    function testWithdrawFlow() public {
        // First, execute a swap to get tokens in the converter
        uint256 swapAmount = 1000e18;
        bytes32 swapNullifier = keccak256("swap_tx");

        vm.prank(USER);
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            swapNullifier,
            address(tokenA),
            address(tokenB),
            swapAmount,
            swapAmount - 100e18,
            3000,
            ENCRYPTED_RECIPIENT,
            block.timestamp + 300
        );

        // Now test withdrawal
        uint256 withdrawAmount = 500e18;
        bytes memory withdrawProof = hex"77697468647261775f70726f6f665f64617461";

        uint256 recipientBalanceBefore = tokenB.balanceOf(RECIPIENT);

        // Execute withdrawal
        vm.prank(USER);
        router.withdrawFromEERC(
            address(tokenB),
            withdrawAmount,
            RECIPIENT,
            withdrawProof
        );

        // Verify withdrawal
        assertEq(tokenB.balanceOf(RECIPIENT), recipientBalanceBefore + withdrawAmount, "Withdrawal failed");
    }

    function testErrorConditions() public {
        uint256 amountIn = 1000e18;
        uint256 deadline = block.timestamp + 300;

        // Test with expired deadline
        vm.prank(USER);
        vm.expectRevert(PrivacyV3Router.DeadlineExpired.selector);
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(tokenA),
            address(tokenB),
            amountIn,
            amountIn,
            3000,
            ENCRYPTED_RECIPIENT,
            block.timestamp - 1 // Expired deadline
        );

        // Test with non-existent pool
        vm.mockCall(
            0x1F98431c8aD98523631AE4a59f267346ea31F984,
            abi.encodeWithSignature("getPool(address,address,uint24)",
                address(tokenA), address(tokenB), uint24(3000)),
            abi.encode(address(0)) // Pool doesn't exist
        );

        vm.prank(USER);
        vm.expectRevert(PrivacyV3Router.InvalidPool.selector);
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(tokenA),
            address(tokenB),
            amountIn,
            amountIn,
            3000,
            ENCRYPTED_RECIPIENT,
            deadline
        );
    }

    function testGasUsage() public {
        uint256 amountIn = 1000e18;
        uint256 deadline = block.timestamp + 300;
        bytes32 gasTestNullifier = keccak256("gas_test");

        vm.mockCall(
            0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6,
            abi.encodeWithSignature("quoteExactInputSingle(address,address,uint24,uint256,uint160)",
                address(tokenA), address(tokenB), uint24(3000), amountIn, uint160(0)),
            abi.encode(amountIn)
        );

        // Measure gas usage
        uint256 gasBefore = gasleft();

        vm.prank(USER);
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            gasTestNullifier,
            address(tokenA),
            address(tokenB),
            amountIn,
            amountIn - 100e18,
            3000,
            ENCRYPTED_RECIPIENT,
            deadline
        );

        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used for complete swap:", gasUsed);

        // Generally, a complex swap should use less than 500k gas
        assertTrue(gasUsed < 500000, "Gas usage too high");
    }
}