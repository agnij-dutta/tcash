// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "./Ownable.sol";

contract Pausable is Ownable {
    bool public paused;
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    modifier whenNotPaused() {
        require(!paused, "PAUSED");
        _;
    }

    function pause() external onlyOwner { paused = true; emit Paused(msg.sender); }
    function unpause() external onlyOwner { paused = false; emit Unpaused(msg.sender); }
}


