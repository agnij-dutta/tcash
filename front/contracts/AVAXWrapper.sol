// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AVAXWrapper
 * @dev A simple wrapper contract that allows wrapping native AVAX into an ERC20 token
 * This enables native AVAX to work with the eERC converter system
 */
contract AVAXWrapper is ERC20, ReentrancyGuard {
    uint8 private constant DECIMALS = 18;
    
    event Wrapped(address indexed user, uint256 amount);
    event Unwrapped(address indexed user, uint256 amount);
    
    constructor() ERC20("Wrapped AVAX", "WAVAX") {}
    
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }
    
    /**
     * @dev Wrap native AVAX into WAVAX tokens
     * Users send AVAX to this contract and receive WAVAX tokens
     */
    function wrap() external payable nonReentrant {
        require(msg.value > 0, "AVAXWrapper: Amount must be greater than 0");
        
        _mint(msg.sender, msg.value);
        emit Wrapped(msg.sender, msg.value);
    }
    
    /**
     * @dev Unwrap WAVAX tokens back to native AVAX
     * Users burn WAVAX tokens and receive native AVAX
     */
    function unwrap(uint256 amount) external nonReentrant {
        require(amount > 0, "AVAXWrapper: Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "AVAXWrapper: Insufficient balance");
        require(address(this).balance >= amount, "AVAXWrapper: Insufficient contract balance");
        
        _burn(msg.sender, amount);
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "AVAXWrapper: Transfer failed");
        
        emit Unwrapped(msg.sender, amount);
    }
    
    /**
     * @dev Get the total AVAX balance of the contract
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Emergency function to withdraw all AVAX (only owner)
     * This should never be needed in normal operation
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "AVAXWrapper: No AVAX to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "AVAXWrapper: Emergency withdrawal failed");
    }
}
