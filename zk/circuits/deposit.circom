pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";

// Deposit Circuit
// Purpose: Prove knowledge of commitment preimage and verify deposit validity
// This is a simplified version for MVP - focuses on core commitment verification
template Deposit() {
    // Public inputs (known to verifier)
    signal input commitment;       // The commitment hash
    signal input token;           // Token address (as field element)
    signal input denominationId;  // Fixed denomination bucket ID
    
    // Private inputs (known only to prover)
    signal input amount;          // Deposit amount (private for privacy)
    signal input salt;            // Random value for privacy (rho)
    signal input pubkey;          // User's public key
    
    // Verify commitment = Poseidon(pubkey, token, denominationId, salt)
    // This matches the structure from plan.md: Poseidon(pubKeyNote, tokenAddress, denominationId, rho)
    component hasher = Poseidon(4);
    hasher.inputs[0] <== pubkey;
    hasher.inputs[1] <== token;
    hasher.inputs[2] <== denominationId;
    hasher.inputs[3] <== salt;
    
    // Constraint: provided commitment must equal computed commitment
    commitment === hasher.out;
    
    // For MVP, we'll add basic constraints later
    // Focus on getting the core commitment verification working first
}

// Main circuit instantiation
component main = Deposit();