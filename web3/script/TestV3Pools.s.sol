// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
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

contract TestV3PoolsScript is Script {
    IUniswapV3Factory constant FACTORY = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);
    IQuoter constant QUOTER = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);

    address constant USDC_FUJI = 0x5425890298aed601595a70AB815c96711a31Bc65;
    address constant WAVAX_FUJI = 0xd00ae08403B9bbb9124bB305C09058E32C39A48c;

    function run() external {
        console.log("=== Testing Uniswap V3 Pool Connectivity on Fuji ===");
        console.log("Factory:", address(FACTORY));
        console.log("Quoter:", address(QUOTER));
        console.log("USDC:", USDC_FUJI);
        console.log("WAVAX:", WAVAX_FUJI);

        uint24[3] memory fees = [uint24(500), uint24(3000), uint24(10000)];
        string[3] memory feeNames = ["0.05%", "0.3%", "1.0%"];

        for (uint i = 0; i < fees.length; i++) {
            console.log("\n--- Fee Tier:", feeNames[i], "---");

            address pool = FACTORY.getPool(USDC_FUJI, WAVAX_FUJI, fees[i]);
            console.log("Pool address:", pool);

            if (pool != address(0)) {
                console.log("Pool exists!");

                // Test quote for 1 USDC -> WAVAX
                try QUOTER.quoteExactInputSingle(USDC_FUJI, WAVAX_FUJI, fees[i], 1e6, 0) returns (uint256 quote) {
                    console.log("Quote: 1 USDC =", quote, "WAVAX wei");
                    console.log("Quote: 1 USDC =", quote / 1e18, "WAVAX");
                } catch {
                    console.log("Quote failed - pool may have no liquidity");
                }

                // Test reverse quote
                try QUOTER.quoteExactInputSingle(WAVAX_FUJI, USDC_FUJI, fees[i], 1e18, 0) returns (uint256 quote) {
                    console.log("Reverse: 1 WAVAX =", quote, "USDC (6 decimals)");
                } catch {
                    console.log("Reverse quote failed");
                }
            } else {
                console.log("Pool does not exist");
            }
        }

        console.log("\n=== Summary ===");
        console.log("If pools exist but quotes fail, they may need liquidity.");
        console.log("Visit Fuji testnet Uniswap interface to add liquidity if needed.");
    }
}