// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IShieldedVault} from "./interfaces/IShieldedVault.sol";
import {IERC20} from "./interfaces/IERC20.sol";
import {IComplianceOracle} from "./interfaces/IComplianceOracle.sol";
import {IncrementalMerkleTree} from "./libraries/IncrementalMerkleTree.sol";
import {Pausable} from "./utils/Pausable.sol";

contract ShieldedVault is IShieldedVault, Pausable {
    address public router; // allowed to call executeSpend
    IComplianceOracle public complianceOracle;
    IncrementalMerkleTree public merkleTree; // Merkle tree instance (legacy commitments)

    mapping(bytes32 => bool) public nullifierUsed;
    mapping(address => bool) public supportedToken; // MVP: allowlist tokens
    mapping(address => uint256[]) public tokenDenominations; // bucket list per token

    error NotRouter();

    constructor(address complianceOracle_) {
        complianceOracle = IComplianceOracle(complianceOracle_);
        merkleTree = new IncrementalMerkleTree();
    }

    modifier onlyRouter() {
        if (msg.sender != router) revert NotRouter();
        _;
    }

    function setRouter(address r) external onlyOwner { router = r; }
    function setComplianceOracle(address o) external onlyOwner { complianceOracle = IComplianceOracle(o); }
    function setSupportedToken(address token, bool allowed) external onlyOwner { supportedToken[token] = allowed; }
    function setDenominations(address token, uint256[] calldata buckets) external onlyOwner { tokenDenominations[token] = buckets; }
    function transferOwnership(address newOwner) external override onlyOwner { owner = newOwner; }

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


    function executeSpend(
        bytes calldata /*proof*/,
        bytes32 root,
        bytes32 nullifier,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 /*minAmountOut*/
    ) external onlyRouter whenNotPaused returns (uint256 amountOut) {
        if (!supportedToken[tokenIn] || !supportedToken[tokenOut]) revert Unauthorized();

        // Check root is in recent history using Merkle tree's root tracking
        if (!merkleTree.isKnownRoot(uint256(root))) revert InvalidRoot();

        if (nullifierUsed[nullifier]) revert NullifierAlreadyUsed();
        nullifierUsed[nullifier] = true;
        emit NullifierUsed(nullifier);
        emit SpendAccepted(nullifier, tokenIn, amountIn);

        // Transfer tokens to router for swap
        require(IERC20(tokenIn).transfer(router, amountIn), "ROUTER_TRANSFER_FAIL");
        // Router is expected to perform swap and callback/settle off-chain for MVP testing
        // Return amountOut as zero in skeleton
        return 0;
    }
}


