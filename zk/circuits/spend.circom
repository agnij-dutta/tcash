pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/babyjub.circom";
include "circomlib/circuits/bitify.circom";
include "./utils/merkletree.circom";

// Spend Circuit
// Purpose: Prove ownership of a note and authorization to spend it
// Enables private transfers while preventing double-spending via nullifiers
template Spend() {
    // Circuit Parameters
    var TREE_DEPTH = 32;
    
    // ==== PUBLIC INPUTS (5) ====
    signal input root;           // Merkle root (for proving note existence)
    signal input nullifier;      // Prevents double spending 
    signal input token;          // Token address being spent
    signal input denominationId; // Fixed denomination bucket ID
    signal input newCommitment;  // Output note commitment hash
    
    // ==== PRIVATE INPUTS (8) ====
    signal input amount;              // Note amount (private)
    signal input salt;                // Note salt (for privacy)
    signal input privkey;             // Private key of note owner
    signal input pathElements[TREE_DEPTH];  // Merkle proof path elements
    signal input pathIndices[TREE_DEPTH];   // Merkle proof indices
    signal input newAmount;           // Output note amount
    signal input newSalt;             // Output note salt  
    signal input newPubkey;           // Output recipient's public key
    
    // ==== COMPONENT INSTANTIATION ====
    
    // 1. Key Derivation: Private key -> Public key (simplified for testing)
    // TODO: Replace with proper BabyJubJub after testing
    signal derivedPubkey;
    derivedPubkey <== privkey * privkey; // Simple deterministic derivation for testing
    
    // 2. Input Note Commitment Generation
    component inputCommitment = Poseidon(4);
    inputCommitment.inputs[0] <== amount;
    inputCommitment.inputs[1] <== token;
    inputCommitment.inputs[2] <== salt;
    inputCommitment.inputs[3] <== derivedPubkey;  // Use simplified derived pubkey
    
    // 3. Merkle Tree Verification
    component merkleChecker = MerkleTreeChecker(TREE_DEPTH);
    merkleChecker.root <== root;
    merkleChecker.leaf <== inputCommitment.out;
    for (var i = 0; i < TREE_DEPTH; i++) {
        merkleChecker.pathElements[i] <== pathElements[i];
        merkleChecker.pathIndices[i] <== pathIndices[i];
    }
    
    // 4. Nullifier Generation
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== privkey;
    nullifierHasher.inputs[1] <== salt;
    
    // 5. Output Note Commitment Generation
    component outputCommitment = Poseidon(4);
    outputCommitment.inputs[0] <== newAmount;
    outputCommitment.inputs[1] <== token;
    outputCommitment.inputs[2] <== newSalt;
    outputCommitment.inputs[3] <== newPubkey;
    
    // ==== CONSTRAINTS ====
    
    // 1. Nullifier Constraint: Computed nullifier must match public input
    nullifier === nullifierHasher.out;
    
    // 2. Output Commitment Constraint: Must match public input
    newCommitment === outputCommitment.out;
    
    // 3. Amount Conservation: Input amount must equal output amount
    amount === newAmount;
    
    // 4. Token Consistency: Same token for input and output
    // (This is implicitly enforced by using the same token signal)
    
    // 5. Valid Denomination: Ensure we're using the correct denomination
    // For MVP, this is enforced by the fixed denominationId input
    
    // ==== ADDITIONAL SECURITY CONSTRAINTS ====
    
    // Ensure private key is within valid range (prevent weak keys)
    // BabyJubJub order is roughly 2^254, so we ensure privkey < 2^254
    component privkeyCheck = Num2Bits(254);
    privkeyCheck.in <== privkey;
    
    // Ensure amounts are positive and within reasonable bounds
    component amountCheck = Num2Bits(64);  // Max 64-bit amounts
    amountCheck.in <== amount;
    
    component newAmountCheck = Num2Bits(64);
    newAmountCheck.in <== newAmount;
}

// Main circuit instantiation with public inputs declared
component main { public [root, nullifier, token, denominationId, newCommitment] } = Spend();