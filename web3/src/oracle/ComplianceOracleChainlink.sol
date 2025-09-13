// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IComplianceOracle} from "../interfaces/IComplianceOracle.sol";
import {IAggregatorV3} from "../interfaces/IAggregatorV3.sol";

// Converts token amount to USD using Chainlink price feeds and compares to thresholds.
// Thresholds are expressed in USD 1e18. Token amounts are scaled by tokenDecimals.
contract ComplianceOracleChainlink is IComplianceOracle {
    address public owner;

    struct TokenConfig {
        address priceFeed; // token/USD aggregator
        uint8 tokenDecimals; // ERC20 decimals
        uint256 usdThreshold1e18; // max allowed per withdrawal
    }

    mapping(address => TokenConfig) public tokenConfig;

    error NotOwner();
    error FeedNotSet();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function setTokenConfig(
        address token,
        address priceFeed,
        uint8 tokenDecimals,
        uint256 usdThreshold1e18
    ) external onlyOwner {
        tokenConfig[token] = TokenConfig({
            priceFeed: priceFeed,
            tokenDecimals: tokenDecimals,
            usdThreshold1e18: usdThreshold1e18
        });
    }

    function isExitAllowed(address token, uint256 amount) external view returns (bool) {
        TokenConfig memory cfg = tokenConfig[token];
        if (cfg.priceFeed == address(0)) revert FeedNotSet();
        (, int256 answer,, uint256 updatedAt,) = IAggregatorV3(cfg.priceFeed).latestRoundData();
        require(answer > 0, "NEG_PRICE");
        require(updatedAt != 0, "STALE");
        uint8 feedDecimals = IAggregatorV3(cfg.priceFeed).decimals();

        // Convert amount to USD 1e18: amount * price * 10^(18 - feedDec) / 10^tokenDec
        uint256 price = uint256(answer);
        uint256 scale = 10 ** (18 - feedDecimals);
        uint256 amountUsd1e18 = (amount * price * scale) / (10 ** cfg.tokenDecimals);
        return amountUsd1e18 <= cfg.usdThreshold1e18;
    }
}


