// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "../interfaces/IERC20.sol";

contract MockSwapAdapter {
    // Simulates a swap by transferring tokenIn from caller and minting tokenOut to recipient
    // For tests only. Assumes caller already moved funds to this adapter.
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        // burn incoming by sending to zero, then mint out by transferring pre-minted liquidity
        require(IERC20(tokenIn).transfer(address(0xdead), amountIn), "IN_FAIL");
        uint256 bal = IERC20(tokenOut).balanceOf(address(this));
        amountOut = amountIn; // 1:1 mock rate
        require(bal >= amountOut && amountOut >= minAmountOut, "RATE_FAIL");
        require(IERC20(tokenOut).transfer(recipient, amountOut), "OUT_FAIL");
    }
}




