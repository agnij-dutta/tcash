// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPrivacyRouter {
    error ProofVerificationFailed();
    error SlippageExceeded();
    error UnsupportedPool();
    error InvalidHookData();
    error ComplianceBlocked();

    event SpendRecorded(bytes32 indexed nullifier, bytes32 indexed root, address indexed caller);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event DepositedToEERC(address indexed tokenOut, uint256 amountOut);
    event WithdrawnFromEERC(address indexed token, address indexed recipient, uint256 amount);

    // Execute private spend, perform Uniswap v4 swap, then deposit into EERC (Converter)
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
    ) external returns (uint256 amountOut);

    // Withdraw from EERC back to public ERC20 with compliance gating
    function withdrawFromEERC(
        address token,
        uint256 amount,
        address recipient,
        bytes calldata withdrawProof
    ) external;
}


