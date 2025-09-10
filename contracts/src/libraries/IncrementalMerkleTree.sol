// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PoseidonT3.sol";

/**
 * @title IncrementalMerkleTree
 * @dev Incremental Merkle tree using Poseidon hash function
 * Optimized for frequent insertions with minimal gas cost
 * Based on tornado.cash and semaphore implementations
 */
contract IncrementalMerkleTree {
    using PoseidonT3 for uint256;

    uint256 public constant TREE_DEPTH = 32;
    uint256 public constant MAX_LEAVES = 2**TREE_DEPTH;
    uint256 public constant ROOT_HISTORY_SIZE = 256;
    
    // Current state
    uint256 public nextIndex = 0;
    uint256 public currentRootIndex = 0;
    
    // Tree state: stores the rightmost filled subtree at each level
    mapping(uint256 => uint256) public filledSubtrees;
    
    // Root history: ring buffer of recent roots
    mapping(uint256 => uint256) public roots;
    
    event LeafInsertion(uint256 indexed leaf, uint256 leafIndex, uint256 newRoot);
    event RootUpdate(uint256 indexed root, uint256 index);
    
    constructor() {
        // Initialize filled subtrees with zero hashes
        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            filledSubtrees[i] = PoseidonT3.getZeroHash(i);
        }
        
        // Set initial root (all zeros)
        roots[0] = PoseidonT3.getZeroHash(TREE_DEPTH);
        emit RootUpdate(roots[0], 0);
    }
    
    /**
     * @dev Insert a new leaf into the tree
     * @param leaf The leaf value to insert
     * @return leafIndex The index where the leaf was inserted
     */
    function insert(uint256 leaf) public returns (uint256 leafIndex) {
        require(nextIndex < MAX_LEAVES, "Tree is full");
        
        leafIndex = nextIndex;
        uint256 currentHash = leaf;
        uint256 currentIndex = leafIndex;
        
        // Update the tree by hashing up from leaf to root
        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            if (currentIndex % 2 == 0) {
                // Left node - store as filled subtree for future right nodes
                filledSubtrees[i] = currentHash;
                // For left nodes, we can't compute the parent yet
                break;
            } else {
                // Right node - combine with stored left node
                currentHash = PoseidonT3.hash(filledSubtrees[i], currentHash);
                currentIndex /= 2;
            }
        }
        
        // If we processed all levels, we have a new root
        if (currentIndex == 0) {
            _updateRoot(currentHash);
        } else {
            // Update root with the new subtree
            _updateRoot(_computeRoot());
        }
        
        nextIndex++;
        emit LeafInsertion(leaf, leafIndex, latestRoot());
        
        return leafIndex;
    }
    
    /**
     * @dev Compute the current root by walking up from the next insertion point
     */
    function _computeRoot() internal view returns (uint256) {
        uint256 currentHash = PoseidonT3.getZeroHash(0);
        uint256 currentIndex = nextIndex;
        
        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            if (currentIndex % 2 == 0) {
                currentHash = PoseidonT3.hash(filledSubtrees[i], currentHash);
            } else {
                currentHash = PoseidonT3.hash(currentHash, filledSubtrees[i]);
            }
            currentIndex /= 2;
        }
        
        return currentHash;
    }
    
    /**
     * @dev Update the root history
     */
    function _updateRoot(uint256 newRoot) internal {
        currentRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        roots[currentRootIndex] = newRoot;
        emit RootUpdate(newRoot, currentRootIndex);
    }
    
    /**
     * @dev Get the latest root
     */
    function latestRoot() public view returns (uint256) {
        return roots[currentRootIndex];
    }
    
    /**
     * @dev Check if a root exists in recent history
     */
    function isKnownRoot(uint256 root) public view returns (bool) {
        if (root == 0) return false;
        
        // Check all roots in history
        for (uint256 i = 0; i < ROOT_HISTORY_SIZE; i++) {
            if (roots[i] == root) return true;
        }
        
        return false;
    }
    
    /**
     * @dev Get the Merkle path for a leaf at given index
     * This is used for generating proofs off-chain
     */
    function getMerklePath(uint256 leafIndex) external view returns (
        uint256[TREE_DEPTH] memory pathElements,
        uint256[TREE_DEPTH] memory pathIndices
    ) {
        require(leafIndex < nextIndex, "Leaf does not exist");
        
        uint256 currentIndex = leafIndex;
        
        for (uint256 i = 0; i < TREE_DEPTH; i++) {
            pathIndices[i] = currentIndex % 2;
            
            if (pathIndices[i] == 0) {
                // Left node - sibling is either filled subtree or zero
                if (currentIndex + 1 < (1 << i) * (nextIndex / (1 << i) + 1)) {
                    pathElements[i] = filledSubtrees[i]; // Simplified - needs proper sibling calculation
                } else {
                    pathElements[i] = PoseidonT3.getZeroHash(i);
                }
            } else {
                // Right node - sibling is the filled subtree
                pathElements[i] = filledSubtrees[i];
            }
            
            currentIndex /= 2;
        }
        
        return (pathElements, pathIndices);
    }
}