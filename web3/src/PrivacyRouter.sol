// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPrivacyRouter} from "./interfaces/IPrivacyRouter.sol";
import {IShieldedVault} from "./interfaces/IShieldedVault.sol";
import {IComplianceOracle} from "./interfaces/IComplianceOracle.sol";
import {IEERCConverter} from "./interfaces/IEERCConverter.sol";
import {Pausable} from "./utils/Pausable.sol";

contract PrivacyRouter is IPrivacyRouter, Pausable {
    IShieldedVault public immutable vault;
    IEERCConverter public converter;
    IComplianceOracle public compliance;

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
    ) external whenNotPaused returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert SlippageExceeded();

        // Delegate spend to vault which moves funds and records nullifier
        amountOut = vault.executeSpend(
            proof,
            root,
            nullifier,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut
        );
        emit SpendRecorded(nullifier, root, msg.sender);

        // After swap, deposit into EERC private balance for recipient
        if (address(converter) != address(0) && amountOut > 0) {
            converter.deposit(tokenOut, amountOut, encryptedRecipientData);
            emit DepositedToEERC(tokenOut, amountOut);
        }
        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut);
    }

    function withdrawFromEERC(
        address token,
        uint256 amount,
        address recipient,
        bytes calldata withdrawProof
    ) external whenNotPaused {
        if (address(compliance) != address(0)) {
            if (!compliance.isExitAllowed(token, amount)) revert ComplianceBlocked();
        }
        converter.withdraw(token, amount, recipient, withdrawProof);
        emit WithdrawnFromEERC(token, recipient, amount);
    }
}


