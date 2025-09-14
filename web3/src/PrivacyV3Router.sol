// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPrivacyRouter} from "./interfaces/IPrivacyRouter.sol";
import {IShieldedVault} from "./interfaces/IShieldedVault.sol";
import {IComplianceOracle} from "./interfaces/IComplianceOracle.sol";
import {IEERCConverter} from "./interfaces/IEERCConverter.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {Pausable} from "./utils/Pausable.sol";

// Uniswap V3 interfaces
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

interface IUniswapV3SwapCallback {
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}

interface IUniswapV3Pool {
    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);

    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}

interface IQuoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

contract PrivacyV3Router is IPrivacyRouter, IUniswapV3SwapCallback, Pausable {
    IShieldedVault public immutable vault;
    IEERCConverter public converter;
    IComplianceOracle public compliance;

    // Uniswap V3 contracts on Fuji testnet
    IUniswapV3Factory public constant UNISWAP_V3_FACTORY =
        IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);

    IQuoter public constant UNISWAP_V3_QUOTER =
        IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);

    // Callback data structure
    struct SwapCallbackData {
        bytes32 nullifier;
        bytes32 root;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bytes encryptedRecipientData;
        bool isSpendAndDeposit;
    }

    // Temporary storage for proof during callback
    bytes private _tempProof;

    // Events for privacy tracking
    event PrivateSwapInitiated(bytes32 indexed nullifier, address indexed tokenIn, address indexed tokenOut);
    event SwapQuoteObtained(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 expectedOut);
    event PrivateDepositCompleted(address indexed token, uint256 amount, bytes32 indexed recipientHash);

    error DeadlineExpired();
    error InvalidPool();
    error UnauthorizedCallback();
    error InsufficientOutput();
    error ProofHandlingFailed();

    constructor(address vault_) {
        vault = IShieldedVault(vault_);
    }

    function setConverter(address converter_) external onlyOwner {
        converter = IEERCConverter(converter_);
    }

    function setCompliance(address compliance_) external onlyOwner {
        compliance = IComplianceOracle(compliance_);
    }

    function transferOwnership(address newOwner) external override onlyOwner {
        owner = newOwner;
    }

    /**
     * @dev Interface-compliant function for IPrivacyRouter
     */
    function spendSwapAndDeposit(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata encryptedRecipientData,
        uint256 deadline
    ) external override returns (uint256 amountOut) {
        // Use default medium fee tier (0.3%)
        return spendSwapAndDepositV3(
            proof,
            root,
            nullifier,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            3000, // 0.3% fee
            encryptedRecipientData,
            deadline
        );
    }

    /**
     * @dev Private spend → Uniswap V3 swap → EERC deposit with callback pattern
     * @param proof ZK proof for the private spend
     * @param root Merkle tree root for nullifier validation
     * @param nullifier Unique nullifier to prevent double-spending
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount to swap from private balance
     * @param minAmountOut Minimum output amount (slippage protection)
     * @param fee Uniswap V3 pool fee tier (500, 3000, or 10000)
     * @param encryptedRecipientData Encrypted recipient data for EERC deposit
     * @param deadline Transaction deadline
     */
    function spendSwapAndDepositV3(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee,
        bytes calldata encryptedRecipientData,
        uint256 deadline
    ) public whenNotPaused returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert DeadlineExpired();

        emit PrivateSwapInitiated(nullifier, tokenIn, tokenOut);

        // Get the pool for this token pair and fee
        address pool = UNISWAP_V3_FACTORY.getPool(tokenIn, tokenOut, fee);
        if (pool == address(0)) revert InvalidPool();

        // Determine swap direction
        address token0 = IUniswapV3Pool(pool).token0();
        address token1 = IUniswapV3Pool(pool).token1();
        bool zeroForOne = tokenIn == token0;

        // Store proof temporarily for callback use
        _tempProof = proof;

        // Prepare callback data
        SwapCallbackData memory callbackData = SwapCallbackData({
            nullifier: nullifier,
            root: root,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            encryptedRecipientData: encryptedRecipientData,
            isSpendAndDeposit: true
        });

        // Get quote for expected output
        try UNISWAP_V3_QUOTER.quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, 0) returns (uint256 expectedOut) {
            emit SwapQuoteObtained(tokenIn, tokenOut, amountIn, expectedOut);
        } catch {
            // Quote failed, continue with swap
        }

        // Track balance before swap
        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));

        // Execute swap with callback
        IUniswapV3Pool(pool).swap(
            address(this), // recipient
            zeroForOne,
            int256(amountIn), // exact input
            zeroForOne ? 4295128740 : 1461446703485210103287273052203988822378723970341, // price limit (no limit)
            abi.encode(callbackData)
        );

        // Calculate actual output
        uint256 balanceAfter = IERC20(tokenOut).balanceOf(address(this));
        amountOut = balanceAfter - balanceBefore;

        if (amountOut < minAmountOut) revert InsufficientOutput();

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut);

        // Deposit swapped tokens to EERC for recipient privacy
        if (address(converter) != address(0) && amountOut > 0) {
            IERC20(tokenOut).approve(address(converter), amountOut);
            converter.deposit(tokenOut, amountOut, encryptedRecipientData);

            bytes32 recipientHash = keccak256(encryptedRecipientData);
            emit PrivateDepositCompleted(tokenOut, amountOut, recipientHash);
            emit DepositedToEERC(tokenOut, amountOut);
        }

        // Clear temporary proof for security
        delete _tempProof;
    }

    /**
     * @dev Uniswap V3 callback - handles token settlement similar to V4 callback pattern
     * This is called by the pool during swap execution
     */
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        // Decode callback data
        SwapCallbackData memory callbackData = abi.decode(data, (SwapCallbackData));

        // Verify this is called from a valid pool
        address pool = UNISWAP_V3_FACTORY.getPool(
            callbackData.tokenIn,
            callbackData.tokenOut,
            IUniswapV3Pool(msg.sender).fee()
        );
        if (msg.sender != pool) revert UnauthorizedCallback();

        // Determine which token we need to pay (positive delta means we owe)
        address tokenToPay;
        uint256 amountToPay;

        address token0 = IUniswapV3Pool(pool).token0();
        address token1 = IUniswapV3Pool(pool).token1();

        if (amount0Delta > 0) {
            tokenToPay = token0;
            amountToPay = uint256(amount0Delta);
        } else if (amount1Delta > 0) {
            tokenToPay = token1;
            amountToPay = uint256(amount1Delta);
        }

        // Execute spend from vault if this is a spend-and-deposit operation
        if (callbackData.isSpendAndDeposit && tokenToPay == callbackData.tokenIn) {
            // Execute spend via vault (validates ZK proof and transfers funds to this contract)
            vault.executeSpend(
                _tempProof, // Use stored proof
                callbackData.root,
                callbackData.nullifier,
                callbackData.tokenIn,
                callbackData.tokenOut,
                callbackData.amountIn,
                callbackData.minAmountOut
            );
            emit SpendRecorded(callbackData.nullifier, callbackData.root, tx.origin);

            // Clear temporary proof for security
            delete _tempProof;
        }

        // Pay the pool
        if (amountToPay > 0) {
            IERC20(tokenToPay).transfer(msg.sender, amountToPay);
        }
    }

    /**
     * @dev Public swap using V3 with callback pattern (no vault involvement)
     */
    function swapExactInputSingleV3(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 minAmountOut,
        address payer,
        address recipient
    ) external whenNotPaused returns (uint256 amountOut) {
        address pool = UNISWAP_V3_FACTORY.getPool(tokenIn, tokenOut, fee);
        if (pool == address(0)) revert InvalidPool();

        // Pull tokens from payer if different from msg.sender
        if (payer != msg.sender) {
            IERC20(tokenIn).transferFrom(payer, address(this), amountIn);
        } else {
            IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        }

        bool zeroForOne = tokenIn == IUniswapV3Pool(pool).token0();

        SwapCallbackData memory callbackData = SwapCallbackData({
            nullifier: bytes32(0),
            root: bytes32(0),
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            encryptedRecipientData: "",
            isSpendAndDeposit: false
        });

        uint256 balanceBefore = IERC20(tokenOut).balanceOf(recipient);

        IUniswapV3Pool(pool).swap(
            recipient,
            zeroForOne,
            int256(amountIn),
            zeroForOne ? 4295128740 : 1461446703485210103287273052203988822378723970341,
            abi.encode(callbackData)
        );

        uint256 balanceAfter = IERC20(tokenOut).balanceOf(recipient);
        amountOut = balanceAfter - balanceBefore;

        if (amountOut < minAmountOut) revert InsufficientOutput();
    }

    /**
     * @dev Get quote for private swap without executing
     */
    function getSwapQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return UNISWAP_V3_QUOTER.quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }

    /**
     * @dev Check if a V3 pool exists for given tokens and fee
     */
    function poolExists(address tokenA, address tokenB, uint24 fee) external view returns (bool) {
        return UNISWAP_V3_FACTORY.getPool(tokenA, tokenB, fee) != address(0);
    }

    /**
     * @dev Withdraw from EERC back to public ERC20 with compliance gating
     */
    function withdrawFromEERC(
        address token,
        uint256 amount,
        address recipient,
        bytes calldata withdrawProof
    ) external override whenNotPaused {
        // Check compliance if enabled
        if (address(compliance) != address(0)) {
            if (!compliance.isExitAllowed(token, amount)) revert ComplianceBlocked();
        }

        // Execute withdrawal from EERC converter
        converter.withdraw(token, amount, recipient, withdrawProof);
        emit WithdrawnFromEERC(token, recipient, amount);
    }

    /**
     * @dev Emergency function to recover stuck tokens (owner only)
     */
    function recoverToken(address token, uint256 amount, address to) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }

    // Allow contract to receive ETH for WETH operations
    receive() external payable {}
}