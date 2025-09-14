// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PrivacyV3Router} from "../src/PrivacyV3Router.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {ComplianceOracleChainlink} from "../src/oracle/ComplianceOracleChainlink.sol";

/**
 * @title Safe Deployment Script for PrivacyV3Router & ShieldedVault
 * @dev Uses environment variables for private key security
 *
 * Usage:
 * 1. Copy env.example to .env
 * 2. Fill in your PRIVATE_KEY in .env file
 * 3. Run: forge script script/DeployV3Safe.s.sol:DeployV3SafeScript --rpc-url $FUJI_RPC_URL --broadcast
 */
contract DeployV3SafeScript is Script {
    // Avalanche Fuji testnet addresses
    address constant USDC_FUJI = 0x5425890298aed601595a70AB815c96711a31Bc65;
    address constant WAVAX_FUJI = 0xd00ae08403B9bbb9124bB305C09058E32C39A48c;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant UNISWAP_V3_QUOTER = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
    address constant EERC_CONVERTER = 0x372dAB27c8d223Af11C858ea00037Dc03053B22E;

    function run() external {
        // Safe private key loading from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Safe Deployment of PrivacyV3Router & ShieldedVault ===");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance / 1e18, "AVAX");
        console.log("Chain ID:", block.chainid);

        require(block.chainid == 43113, "This script is for Avalanche Fuji testnet only");
        require(deployer.balance >= 1e17, "Need at least 0.1 AVAX for deployment");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy contracts
        ComplianceOracleChainlink compliance = new ComplianceOracleChainlink();
        ShieldedVault vault = new ShieldedVault(address(compliance));
        PrivacyV3Router router = new PrivacyV3Router(address(vault));

        // Configure relationships
        vault.setRouter(address(router));
        router.setConverter(EERC_CONVERTER);
        router.setCompliance(address(compliance));

        // Configure supported tokens
        vault.setSupportedToken(USDC_FUJI, true);
        vault.setSupportedToken(WAVAX_FUJI, true);

        // Set denomination buckets
        uint256[] memory usdcDenoms = new uint256[](4);
        usdcDenoms[0] = 100e6;   // $100
        usdcDenoms[1] = 500e6;   // $500
        usdcDenoms[2] = 1000e6;  // $1000
        usdcDenoms[3] = 5000e6;  // $5000
        vault.setDenominations(USDC_FUJI, usdcDenoms);

        uint256[] memory avaxDenoms = new uint256[](4);
        avaxDenoms[0] = 1e18;    // 1 AVAX
        avaxDenoms[1] = 5e18;    // 5 AVAX
        avaxDenoms[2] = 10e18;   // 10 AVAX
        avaxDenoms[3] = 50e18;   // 50 AVAX
        vault.setDenominations(WAVAX_FUJI, avaxDenoms);

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console.log("ComplianceOracle:", address(compliance));
        console.log("ShieldedVault:   ", address(vault));
        console.log("PrivacyV3Router: ", address(router));
    }
}