pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

// MerkleTreeChecker
// Verifies that a leaf exists in a Merkle tree with a given root
// Uses Poseidon hash function for all internal nodes
template MerkleTreeChecker(levels) {
    assert(levels > 0);
    assert(levels <= 32);
    
    // Public inputs
    signal input root;      // Merkle root to verify against
    signal input leaf;      // Leaf value to prove inclusion of
    
    // Private inputs (Merkle proof)
    signal input pathElements[levels];  // Sibling hashes along the path
    signal input pathIndices[levels];   // 0 = left child, 1 = right child
    
    // Intermediate signals for hash computation
    signal computedHash[levels + 1];
    
    // Start with the leaf as the base
    computedHash[0] <== leaf;
    
    // Hash up the tree, level by level
    component hashers[levels];
    signal s[levels];          // pathIndices[i]
    signal c1_s[levels];       // computedHash[i] * s[i]
    signal pe_s[levels];       // pathElements[i] * s[i]
    signal c1_1_s[levels];     // computedHash[i] * (1 - s[i])
    signal pe_1_s[levels];     // pathElements[i] * (1 - s[i])
    
    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);
        
        // Make pathIndices[i] local for clarity
        s[i] <== pathIndices[i];
        
        // Quadratic terms
        c1_s[i] <== computedHash[i] * s[i];
        pe_s[i] <== pathElements[i] * s[i];
        c1_1_s[i] <== computedHash[i] * (1 - s[i]);
        pe_1_s[i] <== pathElements[i] * (1 - s[i]);
        
        // if pathIndices[i] == 0: left = computedHash[i], right = pathElements[i]
        // if pathIndices[i] == 1: left = pathElements[i], right = computedHash[i]
        hashers[i].inputs[0] <== c1_1_s[i] + pe_s[i];      // left
        hashers[i].inputs[1] <== pe_1_s[i] + c1_s[i];      // right
        
        // Store result for next level
        computedHash[i + 1] <== hashers[i].out;
    }
    
    // Final constraint: computed root must equal expected root
    root === computedHash[levels];
    
    // Additional constraints to ensure pathIndices are binary
    component isValid[levels];
    for (var i = 0; i < levels; i++) {
        // Ensure pathIndices[i] is 0 or 1
        pathIndices[i] * (pathIndices[i] - 1) === 0;
    }
}

// Helper template for testing - creates a simple 2-level tree
template TestMerkleTree() {
    signal input leaf;
    signal input pathElements[2]; 
    signal input pathIndices[2];
    signal input expectedRoot;
    
    component checker = MerkleTreeChecker(2);
    checker.root <== expectedRoot;
    checker.leaf <== leaf;
    
    for (var i = 0; i < 2; i++) {
        checker.pathElements[i] <== pathElements[i];
        checker.pathIndices[i] <== pathIndices[i];
    }
}

// Note: No main component declared here - this is a utility template
// For testing, create a separate test file that instantiates TestMerkleTree as main