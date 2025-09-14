// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {PrivacyV3Router} from "../src/PrivacyV3Router.sol";
import {ShieldedVault} from "../src/ShieldedVault.sol";
import {ComplianceOracleChainlink} from "../src/oracle/ComplianceOracleChainlink.sol";

contract PrivacyV3RouterTest is Test {
    PrivacyV3Router public router;
    ShieldedVault public vault;
    ComplianceOracleChainlink public compliance;

    address constant FUJI_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant FUJI_QUOTER = 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6;
    address constant USDC_FUJI = 0x5425890298aed601595a70AB815c96711a31Bc65;
    address constant WAVAX_FUJI = 0xd00ae08403B9bbb9124bB305C09058E32C39A48c;

    function setUp() public {
        // Deploy contracts
        compliance = new ComplianceOracleChainlink();
        vault = new ShieldedVault(address(compliance));
        router = new PrivacyV3Router(address(vault));

        // Configure relationships
        vault.setRouter(address(router));
    }

    function testDeployment() public {
        assertTrue(address(router) != address(0));
        assertTrue(address(vault) != address(0));
        assertTrue(address(compliance) != address(0));

        assertEq(address(router.vault()), address(vault));
    }

    function testV3Integration() public {
        // Test pool existence check
        bool poolExists = router.poolExists(USDC_FUJI, WAVAX_FUJI, 3000);
        console.log("USDC/WAVAX 0.3% pool exists:", poolExists);

        // Test quote functionality (this will revert if pool doesn't exist)
        if (poolExists) {
            uint256 quote = router.getSwapQuote(USDC_FUJI, WAVAX_FUJI, 1e6, 3000); // 1 USDC
            console.log("Quote for 1 USDC -> WAVAX:", quote);
            assertTrue(quote > 0, "Quote should be positive");
        }
    }

    function testAccessControl() public {
        // Test owner-only functions
        vm.expectRevert();
        vm.prank(address(0x1234));
        router.setConverter(address(0x5678));

        // Test successful owner call
        router.setConverter(address(0x5678));
        assertEq(address(router.converter()), address(0x5678));
    }

    function testCallbackSecurity() public {
        // Test that only valid pools can call the callback
        bytes memory callbackData = abi.encode(
            PrivacyV3Router.SwapCallbackData({
                nullifier: bytes32(0),
                root: bytes32(0),
                tokenIn: USDC_FUJI,
                tokenOut: WAVAX_FUJI,
                amountIn: 1e6,
                minAmountOut: 0,
                encryptedRecipientData: "",
                isSpendAndDeposit: false
            })
        );

        // This should revert because we're not a valid pool
        vm.expectRevert();
        router.uniswapV3SwapCallback(1000, 0, callbackData);
    }
}