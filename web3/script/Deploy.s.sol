// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PrivacyRouter} from "../src/PrivacyRouter.sol";
import {PrivacyV3Router} from "../src/PrivacyV3Router.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {ComplianceOracleChainlink} from "../src/oracle/ComplianceOracleChainlink.sol";
import {IEERCConverter} from "../src/interfaces/IEERCConverter.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy ComplianceOracleChainlink
        ComplianceOracleChainlink compliance = new ComplianceOracleChainlink();
        console.log("ComplianceOracleChainlink deployed at:", address(compliance));

        // Deploy ShieldedVault
        ShieldedVault vault = new ShieldedVault(address(compliance));
        console.log("ShieldedVault deployed at:", address(vault));

        // Deploy PrivacyRouter (legacy)
        PrivacyRouter router = new PrivacyRouter(address(vault));
        console.log("PrivacyRouter deployed at:", address(router));

        // Deploy PrivacyV3Router (Uniswap V3 integration)
        PrivacyV3Router v3Router = new PrivacyV3Router(address(vault));
        console.log("PrivacyV3Router deployed at:", address(v3Router));

        // Set router in vault (use V3 router as primary)
        vault.setRouter(address(v3Router));
        console.log("Router set in vault");

        // Configure for Fuji testnet
        if (block.chainid == 43113) {
            // Set EERC Converter address for Fuji
            address converterAddress = 0x372dAB27c8d223Af11C858ea00037Dc03053B22E;

            // Configure legacy router
            router.setConverter(converterAddress);
            router.setCompliance(address(compliance));

            // Configure V3 router
            v3Router.setConverter(converterAddress);
            v3Router.setCompliance(address(compliance));

            console.log("EERC Converter set to:", converterAddress);
            console.log("Compliance oracle set in both routers");

            // Configure USDC for Fuji (example - you'll need real addresses)
            address usdcFuji = 0x5425890298aed601595a70AB815c96711a31Bc65; // USDC on Fuji
            address usdcPriceFeed = 0x7898Ac4bC4C2B2a99949C4c4d4d4D4D4d4d4D4d4; // Mock price feed
            
            compliance.setTokenConfig(
                usdcFuji,
                usdcPriceFeed,
                6, // USDC decimals
                1000e18 // $1000 threshold
            );
            console.log("USDC configured for compliance");

            // Set supported tokens in vault
            vault.setSupportedToken(usdcFuji, true);
            console.log("USDC set as supported token");
        }

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("ComplianceOracleChainlink:", address(compliance));
        console.log("ShieldedVault:", address(vault));
        console.log("PrivacyRouter (Legacy):", address(router));
        console.log("PrivacyV3Router (Primary):", address(v3Router));
        console.log("EERC Converter (Fuji):", 0x372dAB27c8d223Af11C858ea00037Dc03053B22E);
        console.log("Auditor Public Key (Fuji):", "0xa8b2d1acbd7dbd138d3114972d3c5b34c104a6b073aace27f328890d8c8195d1");

        console.log("\n=== Uniswap V3 Integration (Fuji) ===");
        console.log("V3 Factory:", 0x1F98431c8aD98523631AE4a59f267346ea31F984);
        console.log("V3 Quoter:", 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);
        console.log("WAVAX (Fuji):", 0xd00ae08403B9bbb9124bB305C09058E32C39A48c);
    }
}
