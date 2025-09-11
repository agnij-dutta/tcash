// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {eERC} from "../src/token/eERC.sol";

contract eERCTest is Test {
    eERC token;
    address vault = address(0xBEEF);
    address alice = address(0xA11CE);

    function setUp() public {
        token = new eERC("Encapsulated Token", "eTKN", vault);
    }

    function testMintBurnByVaultOnly() public {
        vm.prank(vault);
        token.mint(alice, 100);
        assertEq(token.balanceOf(alice), 100);

        vm.prank(vault);
        token.burn(alice, 40);
        assertEq(token.balanceOf(alice), 60);
    }

    function test_RevertWhen_MintByNonVault() public {
        vm.expectRevert();
        token.mint(alice, 1);
    }

    function test_RevertWhen_TransferDisabled() public {
        vm.prank(vault);
        token.mint(address(this), 10);
        vm.expectRevert();
        token.transfer(alice, 5);
    }
}


