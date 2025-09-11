// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {ComplianceOracleStub} from "../src/oracle/ComplianceOracleStub.sol";

contract ComplianceOracleStubTest is Test {
    ComplianceOracleStub oracle;
    address token = address(0xAAA);

    function setUp() public {
        oracle = new ComplianceOracleStub();
    }

    function test_DefaultAllows() public view {
        bool ok = oracle.isExitAllowed(token, 1e18);
        assertEq(ok, true);
    }

    function test_SetThresholdBlocksAbove() public {
        oracle.setThreshold(token, 100e18);
        assertTrue(oracle.isExitAllowed(token, 50e18));
        assertTrue(!oracle.isExitAllowed(token, 1000e18));
    }
}




