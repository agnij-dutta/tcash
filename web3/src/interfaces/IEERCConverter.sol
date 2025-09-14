// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEERCConverter {
    // Errors
    error NotRegistered();
    error AuditorKeyNotSet();
    error InvalidEncryptedData();
    error UnsupportedToken();

    // Events
    event Registered(address indexed user, bytes publicKeyX, bytes publicKeyY);
    event AuditorKeySet(address indexed auditor, bytes publicKeyX, bytes publicKeyY);
    event Deposited(address indexed token, address indexed from, uint256 amount, bytes encryptedRecipientData);
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    // Registration (once per L1 user)
    function register(bytes calldata registrationProof) external;

    // Owner-only: set auditor public key used for audit decryption
    function setAuditorPublicKey(bytes calldata auditorPubKeyX, bytes calldata auditorPubKeyY) external;

    // Convert public ERC20 into private EERC balance of recipient
    // encryptedRecipientData carries the recipient BabyJubjub pubkey and metadata per AvaCloud spec
    function deposit(
        address token,
        uint256 amount,
        bytes calldata encryptedRecipientData
    ) external;

    // Redeem private EERC balance back to public ERC20 for the caller or specified recipient
    function withdraw(
        address token,
        uint256 amount,
        address recipient,
        bytes calldata withdrawProof
    ) external;
}


