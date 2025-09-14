// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PrivacyV3Router} from "../src/PrivacyV3Router.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {ComplianceOracleChainlink} from "../src/oracle/ComplianceOracleChainlink.sol";

contract DeployV3IntegrationScript is Script {
    // Avalanche Fuji testnet addresses
    address constant USDC_FUJI = 0x5425890298aed601595a70AB815c96711a31Bc65;
    address constant WAVAX_FUJI = 0xd00ae08403B9bbb9124bB305C09058E32C39A48c;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant UNISWAP_V3_QUOTER = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;

    // EERC Converter address (if already deployed)
    address constant EERC_CONVERTER = 0x372dAB27c8d223Af11C858ea00037Dc03053B22E;

    function run() external {
        // Use your private key (WARNING: NEVER commit private keys to code!)
        uint256 deployerPrivateKey = 0x95492791d9e40b7771b8b57117c399cc5e27d99d4959b7f9592925a398be7bdb;
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=== Deploying PrivacyV3Router & ShieldedVault ===");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance / 1e18, "AVAX");
        console.log("Chain ID:", block.chainid);

        require(block.chainid == 43113, "This script is for Avalanche Fuji testnet only");
        require(deployer.balance >= 1e17, "Need at least 0.1 AVAX for deployment");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ComplianceOracleChainlink
        console.log("\n1. Deploying ComplianceOracleChainlink...");
        ComplianceOracleChainlink compliance = new ComplianceOracleChainlink();
        console.log("   Deployed at:", address(compliance));

        // 2. Deploy ShieldedVault with compliance oracle
        console.log("\n2. Deploying ShieldedVault...");
        ShieldedVault vault = new ShieldedVault(address(compliance));
        console.log("   Deployed at:", address(vault));

        // 3. Deploy PrivacyV3Router with vault reference
        console.log("\n3. Deploying PrivacyV3Router...");
        PrivacyV3Router router = new PrivacyV3Router(address(vault));
        console.log("   Deployed at:", address(router));

        // 4. Configure the contracts
        console.log("\n4. Configuring contracts...");

        // Set router in vault (allows executeSpend calls)
        vault.setRouter(address(router));
        console.log("   Router authorized in vault");

        // Configure router with EERC converter
        router.setConverter(EERC_CONVERTER);
        console.log("   EERC converter set in router");

        // Configure router with compliance oracle
        router.setCompliance(address(compliance));
        console.log("   Compliance oracle set in router");

        // 5. Configure supported tokens
        console.log("\n5. Setting up supported tokens...");

        // Add USDC support
        vault.setSupportedToken(USDC_FUJI, true);
        console.log("   USDC enabled as supported token");

        // Add WAVAX support
        vault.setSupportedToken(WAVAX_FUJI, true);
        console.log("   WAVAX enabled as supported token");

        // 6. Set denomination buckets for privacy pools
        console.log("\n6. Setting denomination buckets...");

        // USDC denominations (6 decimals)
        uint256[] memory usdcDenoms = new uint256[](4);
        usdcDenoms[0] = 100e6;   // $100
        usdcDenoms[1] = 500e6;   // $500
        usdcDenoms[2] = 1000e6;  // $1000
        usdcDenoms[3] = 5000e6;  // $5000
        vault.setDenominations(USDC_FUJI, usdcDenoms);
        console.log("   USDC denominations set");

        // WAVAX denominations (18 decimals)
        uint256[] memory avaxDenoms = new uint256[](4);
        avaxDenoms[0] = 1e18;    // 1 AVAX
        avaxDenoms[1] = 5e18;    // 5 AVAX
        avaxDenoms[2] = 10e18;   // 10 AVAX
        avaxDenoms[3] = 50e18;   // 50 AVAX
        vault.setDenominations(WAVAX_FUJI, avaxDenoms);
        console.log("   WAVAX denominations set");

        vm.stopBroadcast();

        // 7. Deployment summary
        console.log("\n=== DEPLOYMENT SUCCESSFUL ===");
        console.log("");
        console.log("Contract Addresses:");
        console.log("  ComplianceOracle:", address(compliance));
        console.log("  ShieldedVault:   ", address(vault));
        console.log("  PrivacyV3Router: ", address(router));
        console.log("");
        console.log("Integration Addresses:");
        console.log("  EERC Converter:  ", EERC_CONVERTER);
        console.log("  USDC (Fuji):     ", USDC_FUJI);
        console.log("  WAVAX (Fuji):    ", WAVAX_FUJI);
        console.log("  V3 Factory:      ", UNISWAP_V3_FACTORY);
        console.log("  V3 Quoter:       ", UNISWAP_V3_QUOTER);
        console.log("");
        console.log("Configuration:");
        console.log("  USDC denominations: $100, $500, $1000, $5000");
        console.log("  AVAX denominations: 1, 5, 10, 50 AVAX");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Fund the vault with tokens for spend operations");
        console.log("2. Test swaps using the frontend integration");
        console.log("3. Monitor compliance oracle for regulatory requirements");

        // 8. Verify Uniswap V3 pools exist
        console.log("\n=== Verifying Uniswap V3 Pools ===");
        console.log("Check if pools exist for major pairs...");
        console.log("USDC/WAVAX pool addresses should be verified on Fuji");
    }

    function verifyDeployment(
        address _vault,
        address _router,
        address _compliance
    ) external view returns (bool) {
        // Basic deployment verification
        if (_vault.code.length == 0) return false;
        if (_router.code.length == 0) return false;
        if (_compliance.code.length == 0) return false;

        // Check vault-router relationship
        if (ShieldedVault(_vault).router() != _router) return false;

        // Check supported tokens
        if (!ShieldedVault(_vault).supportedToken(USDC_FUJI)) return false;
        if (!ShieldedVault(_vault).supportedToken(WAVAX_FUJI)) return false;

        return true;
    }
}