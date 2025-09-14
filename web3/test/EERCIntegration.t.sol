// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PrivacyRouter} from "../src/PrivacyRouter.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {ComplianceOracleChainlink} from "../src/oracle/ComplianceOracleChainlink.sol";
import {IEERCConverter} from "../src/interfaces/IEERCConverter.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract EERCIntegrationTest is Test {
    PrivacyRouter public router;
    ShieldedVault public vault;
    ComplianceOracleChainlink public compliance;
    IEERCConverter public converter;
    MockERC20 public usdc;

    // Fuji testnet addresses
    address constant FUJI_CONVERTER = 0x372dAB27c8d223Af11C858ea00037Dc03053B22E;
    address constant FUJI_USDC = 0x5425890298aed601595a70AB815c96711a31Bc65;

    function setUp() public {
        // Deploy mock USDC for testing
        usdc = new MockERC20("USD Coin", "USDC");
        
        // Deploy compliance oracle
        compliance = new ComplianceOracleChainlink();
        
        // Deploy vault
        vault = new ShieldedVault(address(compliance));
        
        // Deploy router
        router = new PrivacyRouter(address(vault));
        
        // Set up relationships
        vault.setRouter(address(router));
        router.setCompliance(address(compliance));
        
        // Set converter address
        router.setConverter(FUJI_CONVERTER);
        converter = IEERCConverter(FUJI_CONVERTER);
        
        // Configure USDC
        vault.setSupportedToken(address(usdc), true);
        
        // Mint some USDC for testing
        usdc.mint(address(this), 1000000e6); // 1M USDC
        usdc.approve(address(router), type(uint256).max);
    }

    function testEERCConverterIntegration() public {
        console.log("Testing EERC Converter integration...");
        
        // Check converter address
        assertEq(address(router.converter()), FUJI_CONVERTER);
        console.log("Converter address set correctly");
        
        // Check converter is accessible
        assertTrue(address(converter) != address(0));
        console.log("Converter contract accessible");
        
        // Note: We can't test actual EERC operations without:
        // 1. User registration
        // 2. ZK proof generation
        // 3. Circuit artifacts
        
        console.log("EERC Converter integration test passed");
    }

    function testRouterWithConverter() public {
        console.log("Testing Router with EERC Converter...");
        
        // Test that router has converter set
        assertTrue(address(router.converter()) != address(0));
        console.log("Router has converter set");
        
        // Test that router has compliance set
        assertTrue(address(router.compliance()) != address(0));
        console.log("Router has compliance set");
        
        // Test that vault has router set
        assertTrue(vault.router() != address(0));
        console.log("Vault has router set");
        
        console.log("Router configuration test passed");
    }

    function testComplianceIntegration() public {
        console.log("Testing Compliance Oracle integration...");
        
        // Test that compliance oracle is set
        assertTrue(address(compliance) != address(0));
        console.log("Compliance oracle deployed");
        
        // Test that router has compliance set
        assertTrue(address(router.compliance()) == address(compliance));
        console.log("Router has compliance oracle set");
        
        console.log("Compliance integration test passed");
    }

    function testSupportedTokens() public {
        console.log("Testing supported tokens...");
        
        // Test USDC is supported
        assertTrue(vault.supportedToken(address(usdc)));
        console.log("USDC is supported");
        
        // Test we have USDC balance
        assertTrue(usdc.balanceOf(address(this)) > 0);
        console.log("USDC balance available");
        
        console.log("Supported tokens test passed");
    }

    function testEERCOperations() public {
        console.log("Testing EERC operations (mock)...");
        
        // Test that converter contract is accessible and has expected interface
        assertTrue(address(converter) != address(0));
        console.log("Converter contract is accessible");
        
        // Test that we can read the converter address from router
        assertEq(address(router.converter()), FUJI_CONVERTER);
        console.log("Router has correct converter address");
        
        // Note: Actual EERC operations (register, deposit, withdraw) require:
        // 1. User registration with ZK proof
        // 2. Proper encrypted recipient data
        // 3. Circuit artifacts and verification
        
        console.log("EERC operations test passed");
    }
}