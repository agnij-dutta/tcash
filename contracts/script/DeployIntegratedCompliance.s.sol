// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ComplianceOracleStub} from "../src/oracle/ComplianceOracleStub.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";

/**
 * @title DeployIntegratedCompliance
 * @dev Deployment script for integrating existing Self.xyz KYC with T-Cash compliance
 */
contract DeployIntegratedCompliance is Script {
    // From documentation: Deployed SelfKYCVerifier contract address on Celo Alfajores
    address constant SELF_KYC_VERIFIER = 0x31fE360492189a0c03BACaE36ef9be682Ad3727B;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying with account:", deployer);
        console.log("Account balance:", deployer.balance);
        console.log("Using existing SelfKYCVerifier at:", SELF_KYC_VERIFIER);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy enhanced ComplianceOracleStub with Self.xyz integration
        console.log("Deploying enhanced ComplianceOracleStub...");
        ComplianceOracleStub complianceOracle = new ComplianceOracleStub(SELF_KYC_VERIFIER);
        console.log("ComplianceOracleStub deployed at:", address(complianceOracle));
        
        // Deploy ShieldedVault with the enhanced ComplianceOracle
        console.log("Deploying ShieldedVault...");
        ShieldedVault shieldedVault = new ShieldedVault(address(complianceOracle));
        console.log("ShieldedVault deployed at:", address(shieldedVault));
        
        // Configure initial settings
        console.log("Configuring initial settings...");
        
        // Configure compliance oracle with reasonable defaults
        complianceOracle.updateKYCConfig(
            365 days, // KYC valid for 1 year
            true      // Require KYC for all transactions
        );
        console.log("KYC configuration updated");
        
        // Set document type limits
        complianceOracle.setDocumentTypeLimit(1, 100000 * 1e18); // E-Passport: $100,000
        complianceOracle.setDocumentTypeLimit(2, 50000 * 1e18);  // EU ID Card: $50,000
        complianceOracle.setDocumentTypeLimit(3, 25000 * 1e18);  // Other docs: $25,000
        console.log("Document type limits configured");
        
        // Set age multipliers (basis points: 10000 = 100%)
        complianceOracle.setAgeMultiplier(18, 5000);  // 18+: 50%
        complianceOracle.setAgeMultiplier(25, 10000); // 25+: 100%
        complianceOracle.setAgeMultiplier(35, 15000); // 35+: 150%
        complianceOracle.setAgeMultiplier(50, 20000); // 50+: 200%
        console.log("Age multipliers configured");
        
        // Set example token thresholds
        console.log("Setting up example token thresholds...");
        
        // Example USDC address (replace with actual addresses)
        address mockUSDC = address(0x765DE816845861e75A25fCA122bb6898B8B1282a); // cUSD on Alfajores
        complianceOracle.setThreshold(mockUSDC, 1000000 * 1e18); // $1M global threshold for USDC
        console.log("Set USDC threshold to $1,000,000");
        
        // Configure ShieldedVault
        shieldedVault.setSupportedToken(mockUSDC, true);
        console.log("Added USDC as supported token");
        
        // Set up denominations for USDC
        uint256[] memory usdcDenominations = new uint256[](5);
        usdcDenominations[0] = 100 * 1e18;   // $100
        usdcDenominations[1] = 1000 * 1e18;  // $1,000
        usdcDenominations[2] = 10000 * 1e18; // $10,000
        usdcDenominations[3] = 50000 * 1e18; // $50,000
        usdcDenominations[4] = 100000 * 1e18; // $100,000
        
        shieldedVault.setDenominations(mockUSDC, usdcDenominations);
        console.log("Set USDC denominations");
        
        vm.stopBroadcast();
        
        // Log final deployment info
        console.log("\n=== SELF.XYZ INTEGRATION COMPLETE ===");
        console.log("SelfKYCVerifier (existing):", SELF_KYC_VERIFIER);
        console.log("ComplianceOracleStub (enhanced):", address(complianceOracle));
        console.log("ShieldedVault:", address(shieldedVault));
        console.log("Deployer:", deployer);
        console.log("Network: Celo Alfajores (44787)");
        
        console.log("\n=== INTEGRATION FEATURES ===");
        console.log("✅ Self.xyz KYC verification integrated");
        console.log("✅ Document type based limits");
        console.log("✅ Age-based multipliers");
        console.log("✅ OFAC compliance checks");
        console.log("✅ KYC expiration handling");
        console.log("✅ Privacy-preserving compliance");
        
        console.log("\n=== NEXT STEPS ===");
        console.log("1. Update frontend config with new contract addresses");
        console.log("2. Test KYC verification flow with Self.xyz mobile app");
        console.log("3. Verify compliance rules with different user profiles");
        console.log("4. Configure additional tokens and denominations");
        
        // Save deployment addresses to file for frontend integration
        _writeDeploymentInfo(
            SELF_KYC_VERIFIER,
            address(complianceOracle), 
            address(shieldedVault)
        );
    }
    
    function _writeDeploymentInfo(
        address selfKYCVerifier,
        address complianceOracle,
        address shieldedVault
    ) internal {
        string memory deploymentInfo = string(abi.encodePacked(
            "{\n",
            '  "network": "celo-alfajores",\n',
            '  "chainId": 44787,\n',
            '  "selfKYCVerifier": "', _addressToString(selfKYCVerifier), '",\n',
            '  "complianceOracle": "', _addressToString(complianceOracle), '",\n',
            '  "shieldedVault": "', _addressToString(shieldedVault), '",\n',
            '  "timestamp": "', vm.toString(block.timestamp), '",\n',
            '  "features": [\n',
            '    "Self.xyz KYC Integration",\n',
            '    "Document Type Limits",\n',
            '    "Age-based Multipliers",\n',
            '    "OFAC Compliance",\n',
            '    "Privacy-preserving"\n',
            '  ]\n',
            "}"
        ));
        
        vm.writeFile("./deployments/self-integration.json", deploymentInfo);
        console.log("Deployment info saved to ./deployments/self-integration.json");
    }
    
    function _addressToString(address addr) internal pure returns (string memory) {
        return vm.toString(addr);
    }
}
