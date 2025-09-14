// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PrivacyV3Router} from "../src/PrivacyV3Router.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {IShieldedVault} from "../src/interfaces/IShieldedVault.sol";
import {ComplianceOracleChainlink} from "../src/oracle/ComplianceOracleChainlink.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

// Mock contracts for testing
contract MockEERC20 is IERC20 {
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

contract MockEERCConverter {
    event Deposit(address indexed token, uint256 amount, bytes encryptedData);
    event Withdraw(address indexed token, uint256 amount, address indexed recipient);

    function deposit(address token, uint256 amount, bytes calldata encryptedData) external {
        // Pull tokens from sender
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        emit Deposit(token, amount, encryptedData);
    }

    function withdraw(address token, uint256 amount, address recipient, bytes calldata /*proof*/) external {
        // Send tokens to recipient
        IERC20(token).transfer(recipient, amount);
        emit Withdraw(token, amount, recipient);
    }
}

contract MockUniswapV3Pool {
    address public token0;
    address public token1;
    uint24 public fee;

    // Simple 1:1 exchange rate for testing
    uint256 public constant EXCHANGE_RATE = 1e18;

    constructor(address _token0, address _token1, uint24 _fee) {
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
    }

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160, /*sqrtPriceLimitX96*/
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1) {
        require(amountSpecified > 0, "Invalid amount");

        uint256 amountIn = uint256(amountSpecified);
        uint256 amountOut = (amountIn * EXCHANGE_RATE) / 1e18;

        // Determine input/output amounts
        if (zeroForOne) {
            amount0 = int256(amountIn);   // We owe token0 (positive)
            amount1 = -int256(amountOut); // We receive token1 (negative)
        } else {
            amount0 = -int256(amountOut); // We receive token0 (negative)
            amount1 = int256(amountIn);   // We owe token1 (positive)
        }

        // Call back to the router for settlement
        PrivacyV3Router(payable(msg.sender)).uniswapV3SwapCallback(amount0, amount1, data);

        // Transfer output tokens to recipient
        address tokenOut = zeroForOne ? token1 : token0;
        IERC20(tokenOut).transfer(recipient, amountOut);
    }
}

contract MockUniswapV3Factory {
    mapping(bytes32 => address) public pools;

    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        bytes32 key = keccak256(abi.encodePacked(token0, token1, fee));

        pool = address(new MockUniswapV3Pool(token0, token1, fee));
        pools[key] = pool;
    }

    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        bytes32 key = keccak256(abi.encodePacked(token0, token1, fee));
        return pools[key];
    }
}

contract MockUniswapV3Quoter {
    function quoteExactInputSingle(
        address, /*tokenIn*/
        address, /*tokenOut*/
        uint24, /*fee*/
        uint256 amountIn,
        uint160 /*sqrtPriceLimitX96*/
    ) external pure returns (uint256 amountOut) {
        // Simple 1:1 exchange for testing
        return amountIn;
    }
}

contract PrivacyV3RouterIntegrationTest is Test {
    PrivacyV3Router public router;
    ShieldedVault public vault;
    ComplianceOracleChainlink public compliance;
    MockEERCConverter public converter;
    MockUniswapV3Factory public factory;
    MockUniswapV3Quoter public quoter;

    MockEERC20 public usdc;
    MockEERC20 public wavax;
    address public pool;

    address public constant USER = address(0x1);
    address public constant RECIPIENT = address(0x2);
    bytes32 public constant TEST_ROOT = bytes32(uint256(0x123));
    bytes32 public constant TEST_NULLIFIER = bytes32(uint256(0x456));
    bytes public constant TEST_PROOF = hex"deadbeef";
    bytes public constant ENCRYPTED_RECIPIENT = hex"abcdef";

    event PrivateSwapInitiated(bytes32 indexed nullifier, address indexed tokenIn, address indexed tokenOut);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event DepositedToEERC(address indexed tokenOut, uint256 amountOut);

    function setUp() public {
        // Deploy mock tokens
        usdc = new MockEERC20("USDC", "USDC", 6);
        wavax = new MockEERC20("WAVAX", "WAVAX", 18);

        // Deploy mock Uniswap V3 infrastructure
        factory = new MockUniswapV3Factory();
        quoter = new MockUniswapV3Quoter();

        // Create pool
        pool = factory.createPool(address(usdc), address(wavax), 3000);

        // Add liquidity to pool (mint tokens to pool)
        usdc.mint(pool, 1000000e6);  // 1M USDC
        wavax.mint(pool, 1000000e18); // 1M WAVAX

        // Deploy core contracts
        compliance = new ComplianceOracleChainlink();
        vault = new ShieldedVault(address(compliance));
        converter = new MockEERCConverter();

        // Deploy router with updated factory and quoter addresses
        router = new PrivacyV3Router(address(vault));

        // Configure relationships
        vault.setRouter(address(router));
        router.setConverter(address(converter));
        router.setCompliance(address(compliance));

        // Configure supported tokens
        vault.setSupportedToken(address(usdc), true);
        vault.setSupportedToken(address(wavax), true);

        // Set up denominations
        uint256[] memory denominations = new uint256[](3);
        denominations[0] = 1000e6;   // 1000 USDC
        denominations[1] = 5000e6;   // 5000 USDC
        denominations[2] = 10000e6;  // 10000 USDC
        vault.setDenominations(address(usdc), denominations);

        // Add tokens to vault for spending
        usdc.mint(address(vault), 100000e6);  // 100k USDC in vault
        wavax.mint(address(vault), 100000e18); // 100k WAVAX in vault

        // Mock a valid root in the Merkle tree
        vm.mockCall(
            address(vault.merkleTree()),
            abi.encodeWithSignature("isKnownRoot(uint256)", uint256(TEST_ROOT)),
            abi.encode(true)
        );
    }

    function testDeploymentAndSetup() public {
        // Test basic deployment
        assertTrue(address(router) != address(0));
        assertTrue(address(vault) != address(0));
        assertTrue(address(converter) != address(0));

        // Test relationships
        assertEq(address(router.vault()), address(vault));
        assertEq(vault.router(), address(router));
        assertEq(address(router.converter()), address(converter));

        // Test pool exists
        address poolAddress = factory.getPool(address(usdc), address(wavax), 3000);
        assertTrue(poolAddress != address(0));
        assertTrue(router.poolExists(address(usdc), address(wavax), 3000));
    }

    function testGetSwapQuote() public {
        uint256 amountIn = 1000e6; // 1000 USDC

        // Mock the quoter call since we're using real addresses in the contract
        vm.mockCall(
            0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6, // Real Fuji quoter address
            abi.encodeWithSignature("quoteExactInputSingle(address,address,uint24,uint256,uint160)",
                address(usdc), address(wavax), uint24(3000), amountIn, uint160(0)),
            abi.encode(amountIn) // 1:1 exchange for simplicity
        );

        uint256 quote = router.getSwapQuote(address(usdc), address(wavax), amountIn, 3000);
        assertEq(quote, amountIn);
    }

    function testSpendSwapAndDepositV3Success() public {
        uint256 amountIn = 1000e6; // 1000 USDC
        uint256 minAmountOut = 900e18; // Minimum 900 WAVAX (allowing for slippage)
        uint256 deadline = block.timestamp + 300;

        // Mock the factory call to return our mock pool
        vm.mockCall(
            0x1F98431c8aD98523631AE4a59f267346ea31F984, // Real Fuji factory address
            abi.encodeWithSignature("getPool(address,address,uint24)",
                address(usdc), address(wavax), uint24(3000)),
            abi.encode(pool)
        );

        // Mock the quoter call
        vm.mockCall(
            0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6,
            abi.encodeWithSignature("quoteExactInputSingle(address,address,uint24,uint256,uint160)",
                address(usdc), address(wavax), uint24(3000), amountIn, uint160(0)),
            abi.encode(amountIn)
        );

        // Expect events
        vm.expectEmit(true, true, true, true);
        emit PrivateSwapInitiated(TEST_NULLIFIER, address(usdc), address(wavax));

        vm.expectEmit(true, true, false, true);
        emit SwapExecuted(address(usdc), address(wavax), amountIn, amountIn);

        vm.expectEmit(true, false, false, true);
        emit DepositedToEERC(address(wavax), amountIn);

        // Execute the swap
        vm.prank(USER);
        uint256 amountOut = router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            amountIn,
            minAmountOut,
            3000,
            ENCRYPTED_RECIPIENT,
            deadline
        );

        assertEq(amountOut, amountIn);

        // Check nullifier was used
        assertTrue(vault.nullifierUsed(TEST_NULLIFIER));
    }

    function testSpendSwapAndDepositInterfaceCompliance() public {
        uint256 amountIn = 1000e6;
        uint256 minAmountOut = 900e18;
        uint256 deadline = block.timestamp + 300;

        // Mock the factory and quoter calls
        vm.mockCall(
            0x1F98431c8aD98523631AE4a59f267346ea31F984,
            abi.encodeWithSignature("getPool(address,address,uint24)",
                address(usdc), address(wavax), uint24(3000)),
            abi.encode(pool)
        );

        vm.mockCall(
            0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6,
            abi.encodeWithSignature("quoteExactInputSingle(address,address,uint24,uint256,uint160)",
                address(usdc), address(wavax), uint24(3000), amountIn, uint160(0)),
            abi.encode(amountIn)
        );

        // Test the interface-compliant function
        vm.prank(USER);
        uint256 amountOut = router.spendSwapAndDeposit(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            amountIn,
            minAmountOut,
            ENCRYPTED_RECIPIENT,
            deadline
        );

        assertEq(amountOut, amountIn);
    }

    function testRevertSpendSwapWithUsedNullifier() public {
        uint256 amountIn = 1000e6;
        uint256 deadline = block.timestamp + 300;

        // Mock factory call
        vm.mockCall(
            0x1F98431c8aD98523631AE4a59f267346ea31F984,
            abi.encodeWithSignature("getPool(address,address,uint24)",
                address(usdc), address(wavax), uint24(3000)),
            abi.encode(pool)
        );

        // First swap succeeds
        vm.prank(USER);
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            amountIn,
            amountIn,
            3000,
            ENCRYPTED_RECIPIENT,
            deadline
        );

        // Second swap with same nullifier should fail
        vm.prank(USER);
        vm.expectRevert(IShieldedVault.NullifierAlreadyUsed.selector);
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            amountIn,
            amountIn,
            3000,
            ENCRYPTED_RECIPIENT,
            deadline
        );
    }

    function testRevertSpendSwapWithExpiredDeadline() public {
        uint256 amountIn = 1000e6;
        uint256 expiredDeadline = block.timestamp - 1;

        vm.prank(USER);
        vm.expectRevert(PrivacyV3Router.DeadlineExpired.selector);
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            amountIn,
            amountIn,
            3000,
            ENCRYPTED_RECIPIENT,
            expiredDeadline
        );
    }

    function testRevertSpendSwapWithNonexistentPool() public {
        uint256 amountIn = 1000e6;
        uint256 deadline = block.timestamp + 300;

        // Mock factory to return zero address (pool doesn't exist)
        vm.mockCall(
            0x1F98431c8aD98523631AE4a59f267346ea31F984,
            abi.encodeWithSignature("getPool(address,address,uint24)",
                address(usdc), address(wavax), uint24(3000)),
            abi.encode(address(0))
        );

        vm.prank(USER);
        vm.expectRevert(PrivacyV3Router.InvalidPool.selector);
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            amountIn,
            amountIn,
            3000,
            ENCRYPTED_RECIPIENT,
            deadline
        );
    }

    function testWithdrawFromEERC() public {
        uint256 amount = 1000e18;
        bytes memory withdrawProof = hex"70726f6f66";

        // Add tokens to converter for withdrawal
        wavax.mint(address(converter), amount);

        // Test successful withdrawal
        vm.prank(USER);
        router.withdrawFromEERC(address(wavax), amount, RECIPIENT, withdrawProof);

        // Check tokens were transferred
        assertEq(wavax.balanceOf(RECIPIENT), amount);
    }

    function testAccessControl() public {
        // Test owner-only functions
        vm.expectRevert();
        vm.prank(USER); // Non-owner
        router.setConverter(address(0x1234));

        // Test successful owner call
        router.setConverter(address(0x1234));
        assertEq(address(router.converter()), address(0x1234));

        // Test ownership transfer
        router.transferOwnership(USER);

        vm.prank(USER);
        router.setConverter(address(0x5678));
        assertEq(address(router.converter()), address(0x5678));
    }

    function testPausability() public {
        // Pause contract
        router.pause();

        uint256 amountIn = 1000e6;
        uint256 deadline = block.timestamp + 300;

        // Should revert when paused
        vm.prank(USER);
        vm.expectRevert();
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            TEST_NULLIFIER,
            address(usdc),
            address(wavax),
            amountIn,
            amountIn,
            3000,
            ENCRYPTED_RECIPIENT,
            deadline
        );

        // Unpause and try again
        router.unpause();

        // Mock necessary calls
        vm.mockCall(
            0x1F98431c8aD98523631AE4a59f267346ea31F984,
            abi.encodeWithSignature("getPool(address,address,uint24)",
                address(usdc), address(wavax), uint24(3000)),
            abi.encode(pool)
        );

        vm.prank(USER);
        // Should succeed now
        router.spendSwapAndDepositV3(
            TEST_PROOF,
            TEST_ROOT,
            bytes32(uint256(0x789)), // Different nullifier
            address(usdc),
            address(wavax),
            amountIn,
            amountIn,
            3000,
            ENCRYPTED_RECIPIENT,
            deadline
        );
    }

    function testEmergencyTokenRecovery() public {
        // Mint some tokens to the router
        uint256 stuckAmount = 1000e6;
        usdc.mint(address(router), stuckAmount);

        // Only owner should be able to recover
        vm.expectRevert();
        vm.prank(USER);
        router.recoverToken(address(usdc), stuckAmount, USER);

        // Owner recovery should work
        uint256 balanceBefore = usdc.balanceOf(USER);
        router.recoverToken(address(usdc), stuckAmount, USER);
        assertEq(usdc.balanceOf(USER), balanceBefore + stuckAmount);
    }
}