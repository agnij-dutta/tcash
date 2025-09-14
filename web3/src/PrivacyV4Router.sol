// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {V4Router} from "v4-periphery/src/V4Router.sol";
import {ReentrancyLock} from "v4-periphery/src/base/ReentrancyLock.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";
import {ActionConstants} from "v4-periphery/src/libraries/ActionConstants.sol";
import {IV4Router} from "v4-periphery/src/interfaces/IV4Router.sol";

import {IERC20} from "./interfaces/IERC20.sol";
import {IShieldedVault} from "./interfaces/IShieldedVault.sol";
import {IEERCConverter} from "./interfaces/IEERCConverter.sol";

contract PrivacyV4Router is V4Router, ReentrancyLock {
    IShieldedVault public immutable vault;
    IEERCConverter public converter;

    error DeadlineExpired();

    constructor(IPoolManager _poolManager, address vault_) V4Router(_poolManager) {
        vault = IShieldedVault(vault_);
    }

    function setConverter(address converter_) external {
        converter = IEERCConverter(converter_);
    }

    function spendSwapAndDepositSingle(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        PoolKey calldata poolKey,
        bool zeroForOne,
        bytes calldata hookData,
        bytes calldata encryptedRecipientData,
        uint256 deadline
    ) external isNotLocked returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert DeadlineExpired();

        uint256 balanceBefore = IERC20(tokenOut).balanceOf(address(this));

        vault.executeSpend(
            proof,
            root,
            nullifier,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut
        );

        bytes memory actions = abi.encodePacked(
            bytes1(uint8(Actions.SETTLE)),
            bytes1(uint8(Actions.SWAP_EXACT_IN_SINGLE)),
            bytes1(uint8(Actions.TAKE))
        );

        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(Currency.wrap(tokenIn), amountIn, false);
        params[1] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: poolKey,
                zeroForOne: zeroForOne,
                amountIn: uint128(amountIn),
                amountOutMinimum: uint128(minAmountOut),
                hookData: hookData
            })
        );
        params[2] = abi.encode(Currency.wrap(tokenOut), address(this), ActionConstants.OPEN_DELTA);

        poolManager.unlock(abi.encode(actions, params));

        uint256 balanceAfter = IERC20(tokenOut).balanceOf(address(this));
        amountOut = balanceAfter - balanceBefore;

        if (address(converter) != address(0) && amountOut > 0) {
            converter.deposit(tokenOut, amountOut, encryptedRecipientData);
        }
    }

    function _pay(Currency token, address payer, uint256 amount) internal override {
        if (payer == address(this)) {
            token.transfer(address(poolManager), amount);
        } else {
            IERC20(Currency.unwrap(token)).transferFrom(payer, address(poolManager), amount);
        }
    }

    function msgSender() public view override returns (address) {
        return _getLocker();
    }

    receive() external payable {}

    // Direct single-hop exact-in swap (no vault or EERC). Caller supplies tokens or pays during settle.
    function swapExactInSingle(
        address payer,
        address recipient,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        PoolKey calldata poolKey,
        bool zeroForOne,
        bytes calldata hookData
    ) external isNotLocked returns (uint256 amountOut) {
        uint256 beforeBal = IERC20(tokenOut).balanceOf(recipient);

        bytes memory actions = abi.encodePacked(
            bytes1(uint8(Actions.SETTLE)),
            bytes1(uint8(Actions.SWAP_EXACT_IN_SINGLE)),
            bytes1(uint8(Actions.TAKE))
        );

        bytes[] memory params = new bytes[](3);
        // settle: payerIsUser true means take from msgSender(); if payer != msg.sender we transfer in first
        bool payerIsUser = true;
        if (payer != msg.sender) {
            // pull tokens into this contract and pay from here
            IERC20(tokenIn).transferFrom(payer, address(this), amountIn);
            payerIsUser = false;
        }
        params[0] = abi.encode(Currency.wrap(tokenIn), amountIn, payerIsUser);
        params[1] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: poolKey,
                zeroForOne: zeroForOne,
                amountIn: uint128(amountIn),
                amountOutMinimum: uint128(minAmountOut),
                hookData: hookData
            })
        );
        params[2] = abi.encode(Currency.wrap(tokenOut), recipient, ActionConstants.OPEN_DELTA);

        poolManager.unlock(abi.encode(actions, params));

        uint256 afterBal = IERC20(tokenOut).balanceOf(recipient);
        amountOut = afterBal - beforeBal;
    }
}


