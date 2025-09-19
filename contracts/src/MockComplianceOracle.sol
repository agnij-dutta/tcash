// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockComplianceOracle
 * @dev Testing contract that allows manual KYC verification without real documents
 */
contract MockComplianceOracle {
    mapping(address => bool) public kycVerified;
    mapping(address => uint256) public userMaxAmounts;
    
    address public owner;
    
    event KYCStatusSet(address indexed user, bool verified, uint256 maxAmount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function setKYCStatus(address user, bool verified) external onlyOwner {
        kycVerified[user] = verified;
        if (verified && userMaxAmounts[user] == 0) {
            userMaxAmounts[user] = 10000e6; // $10,000 default
        }
        emit KYCStatusSet(user, verified, userMaxAmounts[user]);
    }
    
    function setUserMaxAmount(address user, uint256 amount) external onlyOwner {
        userMaxAmounts[user] = amount;
    }
    
    // Compliance interface
    function isUserKYCCompliant(address user) external view returns (bool) {
        return kycVerified[user];
    }
    
    function getUserMaxAmount(address user) external view returns (uint256) {
        return userMaxAmounts[user];
    }
    
    function isExitAllowed(address, uint256 amountUsd) external view returns (bool) {
        return kycVerified[msg.sender] && amountUsd <= userMaxAmounts[msg.sender];
    }
    
    function checkCompliance(address user, address, uint256 amountUsd) external view returns (bool) {
        return kycVerified[user] && amountUsd <= userMaxAmounts[user];
    }
}
