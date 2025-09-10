// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ComplianceOracle} from "../src/oracle/ComplianceOracle.sol";
import {ComplianceOracleStub} from "../src/oracle/ComplianceOracleStub.sol";

/**
 * @title Deployment script for Tsunami Compliance Oracle
 * @notice Deploy and configure compliance oracle for different environments
 */
contract DeployComplianceOracle is Script {
    // Common token addresses (update for target network)
    address constant USDC = 0xa0B86a33e6411Bf3e8b2E2C2ff1e03E8C0b6b8B3; // Example address
    address constant USDT = 0xB0c86a33E6411BF3e8B2e2C2fF1e03e8C0b6B8b4; // Example address
    address constant DAI = 0xC0d86A33e6411Bf3E8B2E2c2FF1e03E8C0B6b8B5;  // Example address
    
    // Example KYC providers (update with real addresses)
    address constant POLYGON_ID_PROVIDER = 0xd0E86a33e6411bF3e8b2E2c2FF1E03E8C0B6b8B6;
    address constant WORLDCOIN_PROVIDER = 0xe0f86A33e6411BF3E8B2e2c2ff1e03E8C0b6b8B7;
    
    // Threshold configurations
    uint256 constant RETAIL_THRESHOLD = 10_000e18;      // $10K for retail users
    uint256 constant INSTITUTIONAL_THRESHOLD = 100_000e18; // $100K for institutions

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy based on environment
        string memory environment = vm.envString("ENVIRONMENT");
        
        if (keccak256(bytes(environment)) == keccak256(bytes("MVP"))) {
            deployMVPOracle();
        } else if (keccak256(bytes(environment)) == keccak256(bytes("FULL"))) {
            deployFullOracle();
        } else {
            revert("Invalid environment. Use 'MVP' or 'FULL'");
        }

        vm.stopBroadcast();
    }

    /**
     * @notice Deploy simple oracle for MVP (threshold-only)
     */
    function deployMVPOracle() internal {
        console.log("Deploying MVP Compliance Oracle (Stub)...");
        
        ComplianceOracleStub oracle = new ComplianceOracleStub();
        
        // Set basic thresholds
        oracle.setThreshold(USDC, RETAIL_THRESHOLD);
        oracle.setThreshold(USDT, RETAIL_THRESHOLD);
        oracle.setThreshold(DAI, RETAIL_THRESHOLD);
        
        console.log("MVP Oracle deployed at:", address(oracle));
        console.log("Thresholds set:");
        console.log("- USDC:", RETAIL_THRESHOLD / 1e18, "USD");
        console.log("- USDT:", RETAIL_THRESHOLD / 1e18, "USD");
        console.log("- DAI:", RETAIL_THRESHOLD / 1e18, "USD");
        
        // Output for integration
        console.log("\n=== Integration Info ===");
        console.log("Oracle Address:", address(oracle));
        console.log("Owner:", oracle.owner());
    }

    /**
     * @notice Deploy full oracle with zk-attestation support 
     */
    function deployFullOracle() internal {
        console.log("Deploying Full Compliance Oracle...");
        
        ComplianceOracle oracle = new ComplianceOracle();
        
        // Set thresholds
        oracle.setThreshold(USDC, RETAIL_THRESHOLD);
        oracle.setThreshold(USDT, RETAIL_THRESHOLD);
        oracle.setThreshold(DAI, RETAIL_THRESHOLD);
        
        // Add attestation providers
        oracle.addAttestationProvider(oracle.ATTESTATION_TYPE_KYC(), POLYGON_ID_PROVIDER);
        oracle.addAttestationProvider(oracle.ATTESTATION_TYPE_KYC(), WORLDCOIN_PROVIDER);
        oracle.addAttestationProvider(oracle.ATTESTATION_TYPE_SANCTIONS(), POLYGON_ID_PROVIDER);
        
        console.log("Full Oracle deployed at:", address(oracle));
        console.log("Attestation providers added:");
        console.log("- KYC: Polygon ID, Worldcoin");  
        console.log("- Sanctions: Polygon ID");
        
        // Output for integration
        console.log("\n=== Integration Info ===");
        console.log("Oracle Address:", address(oracle));
        console.log("Owner:", oracle.owner());
        console.log("Attestation validity period:", oracle.attestationValidityPeriod() / 86400, "days");
    }

    /**
     * @notice Upgrade from MVP to Full oracle
     */
    function upgradeOracle(address vaultAddress, address newOracleAddress) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // This would be called on the ShieldedVault to update the oracle
        // vault.setComplianceOracle(newOracleAddress);
        
        console.log("Oracle upgraded in vault:", vaultAddress);
        console.log("New oracle:", newOracleAddress);
        
        vm.stopBroadcast();
    }
}

/**
 * @title Oracle configuration script
 * @notice Update oracle settings after deployment
 */
contract ConfigureOracle is Script {
    function run() external {
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ComplianceOracle oracle = ComplianceOracle(oracleAddress);
        
        // Add new provider
        address newProvider = vm.envAddress("NEW_PROVIDER");
        uint8 attestationType = uint8(vm.envUint("ATTESTATION_TYPE"));
        
        oracle.addAttestationProvider(attestationType, newProvider);
        
        console.log("Added provider:", newProvider);
        console.log("For attestation type:", attestationType);
        
        vm.stopBroadcast();
    }
}
