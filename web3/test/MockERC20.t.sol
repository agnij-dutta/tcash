// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract MockERC20Test is Test {
    MockERC20 token;
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        token = new MockERC20("Mock", "MOCK");
        token.mint(alice, 100);
    }

    function test_Transfer() public {
        vm.prank(alice);
        token.transfer(bob, 40);
        assertEq(token.balanceOf(alice), 60);
        assertEq(token.balanceOf(bob), 40);
    }

    function test_ApproveAndTransferFrom() public {
        vm.prank(alice);
        token.approve(bob, 30);
        vm.prank(bob);
        token.transferFrom(alice, bob, 30);
        assertEq(token.balanceOf(alice), 70);
        assertEq(token.balanceOf(bob), 30);
    }
}




