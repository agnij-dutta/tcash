// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IShieldedVault} from "./interfaces/IShieldedVault.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";
import {IComplianceOracle} from "./interfaces/IComplianceOracle.sol";
import {IncrementalMerkleTree} from "./libraries/IncrementalMerkleTree.sol";

contract ShieldedVault is IShieldedVault {
    address public owner;
    address public router; // allowed to call executeSpend
    IComplianceOracle public complianceOracle;
    IVerifier public depositVerifier; // Verifies deposit proofs
    IncrementalMerkleTree public merkleTree; // Merkle tree instance

    mapping(bytes32 => bool) public nullifierUsed;
    mapping(address => bool) public supportedToken; // MVP: allowlist tokens
    mapping(address => uint256[]) public tokenDenominations; // bucket list per token

    error NotOwner();
    error NotRouter();

    constructor(address complianceOracle_, address depositVerifier_) {
        owner = msg.sender;
        complianceOracle = IComplianceOracle(complianceOracle_);
        depositVerifier = IVerifier(depositVerifier_);
        merkleTree = new IncrementalMerkleTree();
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRouter() {
        if (msg.sender != router) revert NotRouter();
        _;
    }

    function setRouter(address r) external onlyOwner { router = r; }
    function setComplianceOracle(address o) external onlyOwner { complianceOracle = IComplianceOracle(o); }
    function setSupportedToken(address token, bool allowed) external onlyOwner { supportedToken[token] = allowed; }
    function setDenominations(address token, uint256[] calldata buckets) external onlyOwner { tokenDenominations[token] = buckets; }

    function latestRoot() external view override returns (bytes32) {
        return bytes32(merkleTree.latestRoot());
    }

    function _insertCommitment(bytes32 commitment) internal {
        // Use proper Merkle tree insertion
        uint256 leafIndex = merkleTree.insert(uint256(commitment));
        uint256 newRoot = merkleTree.latestRoot();
        emit CommitmentInserted(commitment, uint32(leafIndex), bytes32(newRoot));
        emit RootUpdated(bytes32(newRoot));
    }

    function _checkDenomination(address token, uint256 amount, uint256 denominationId) internal view {
        uint256[] memory buckets = tokenDenominations[token];
        if (denominationId >= buckets.length || buckets[denominationId] != amount) revert InvalidDenomination();
    }

    function deposit(
        address token,
        uint256 amount,
        bytes32 commitment,
        uint256 denominationId,
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC
    ) external {
        if (!supportedToken[token]) revert Unauthorized();
        _checkDenomination(token, amount, denominationId);
        
        // Verify the deposit proof
        uint[3] memory publicInputs = [
            uint256(commitment),
            uint256(uint160(token)),
            denominationId
        ];
        
        require(
            depositVerifier.verifyProof(_pA, _pB, _pC, publicInputs),
            "INVALID_DEPOSIT_PROOF"
        );
        
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "TRANSFER_FROM_FAIL");
        _insertCommitment(commitment);
    }

    function withdraw(
        bytes calldata /*proof*/,
        bytes32 root,
        bytes32 nullifier,
        address token,
        uint256 amount,
        address recipient
    ) external {
        if (!supportedToken[token]) revert Unauthorized();

        // Check root is in recent history using Merkle tree's root tracking
        if (!merkleTree.isKnownRoot(uint256(root))) revert InvalidRoot();

        if (nullifierUsed[nullifier]) revert NullifierAlreadyUsed();
        nullifierUsed[nullifier] = true;
        emit NullifierUsed(nullifier);

        // Compliance gating (USD amount expected externally pre-converted in MVP)
        require(complianceOracle.isExitAllowed(token, amount), "COMPLIANCE_BLOCKED");

        require(IERC20(token).transfer(recipient, amount), "TRANSFER_FAIL");
    }

    function executeSpend(
        bytes calldata /*proof*/,
        bytes32 root,
        bytes32 nullifier,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 /*minAmountOut*/,
        bytes calldata /*recipientStealthData*/
    ) external onlyRouter returns (uint256 amountOut) {
        if (!supportedToken[tokenIn] || !supportedToken[tokenOut]) revert Unauthorized();

        // Check root is in recent history using Merkle tree's root tracking
        if (!merkleTree.isKnownRoot(uint256(root))) revert InvalidRoot();

        if (nullifierUsed[nullifier]) revert NullifierAlreadyUsed();
        nullifierUsed[nullifier] = true;
        emit NullifierUsed(nullifier);

        // Transfer tokens to router for swap
        require(IERC20(tokenIn).transfer(router, amountIn), "ROUTER_TRANSFER_FAIL");
        // Router is expected to perform swap and callback/settle off-chain for MVP testing
        // Return amountOut as zero in skeleton
        return 0;
    }
}


