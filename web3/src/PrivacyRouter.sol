// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPrivacyRouter} from "./interfaces/IPrivacyRouter.sol";
import {IShieldedVault} from "./interfaces/IShieldedVault.sol";
import {IeERC} from "./interfaces/IeERC.sol";
import {StealthAddress} from "./libraries/StealthAddress.sol";

contract PrivacyRouter is IPrivacyRouter {
    IShieldedVault public immutable vault;
    mapping(address => IeERC) public eERCTokens; // token => eERC mapping

    error UnsupportedToken();
    error SwapFailed();
    error InvalidStealthData();
    error StealthResolutionFailed();

    constructor(address vault_) {
        vault = IShieldedVault(vault_);
    }

    function setERCToken(address token, address eERC) external {
        // Only vault can set eERC token mappings for security
        require(msg.sender == address(vault), "ONLY_VAULT");
        eERCTokens[token] = IeERC(eERC);
    }

    function spendAndSwap(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata recipientStealthData,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert SlippageExceeded();

        // Check if tokens are supported
        IeERC eERCIn = eERCTokens[tokenIn];
        IeERC eERCOut = eERCTokens[tokenOut];
        if (address(eERCIn) == address(0) || address(eERCOut) == address(0)) {
            revert UnsupportedToken();
        }

        // Delegate spend to vault which moves funds and records nullifier
        amountOut = vault.executeSpend(
            proof,
            root,
            nullifier,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            recipientStealthData
        );

        // Handle eERC token transfers for private swap
        // Burn input eERC tokens from user
        eERCIn.burn(msg.sender, amountIn);
        
        // Extract recipient from stealth data 
        address recipient = _extractRecipient(recipientStealthData);
        if (recipient == address(0)) revert StealthResolutionFailed();
        
        // Mint output eERC tokens to recipient
        eERCOut.mint(recipient, amountOut);

        emit PrivateSwapExecuted(msg.sender, recipient, tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * @dev Extract recipient address from stealth data 
     * @param stealthData Encoded stealth data containing recipient information
     * @return recipient The resolved recipient address
     */
    function _extractRecipient(bytes calldata stealthData) internal pure returns (address) {
        // Convert calldata to memory for library function
        bytes memory stealthDataMemory = stealthData;
        return StealthAddress.extractRecipient(stealthDataMemory);
    }

    /**
     * @dev Generate stealth data for a recipient address
     * @param recipient The recipient address
     * @param scheme The stealth scheme to use
     * @param nonce Optional nonce for additional privacy
     * @return stealthData Encoded stealth data
     */
    function generateStealthData(
        address recipient,
        StealthAddress.StealthScheme scheme,
        uint256 nonce
    ) external pure returns (bytes memory stealthData) {
        return StealthAddress.generateStealthData(recipient, scheme, nonce);
    }

    /**
     * @dev Verify stealth data validity
     * @param stealthData The stealth data to verify
     * @param scheme The expected stealth scheme
     * @return valid True if the stealth data is valid
     */
    function isValidStealthData(
        bytes calldata stealthData,
        StealthAddress.StealthScheme scheme
    ) external pure returns (bool valid) {
        return StealthAddress.isValidStealthData(stealthData, scheme);
    }

    /**
     * @dev Get stealth scheme from stealth data
     * @param stealthData The stealth data
     * @return scheme The stealth scheme used
     */
    function getStealthScheme(bytes calldata stealthData) external pure returns (StealthAddress.StealthScheme) {
        return StealthAddress.getStealthScheme(stealthData);
    }

    event PrivateSwapExecuted(
        address indexed user,
        address indexed recipient,
        address indexed tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
}


