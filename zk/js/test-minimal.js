const { poseidon2, poseidon4 } = require("poseidon-lite");

/**
 * Minimal test - just validate poseidon hashing and check if it matches our JS
 */
function testMinimal() {
    console.log("🔍 Minimal Poseidon Test");
    console.log("========================");

    // Test the exact same inputs we use
    const amount = BigInt("1000000000000000000");
    const token = BigInt("123456789");
    const salt = BigInt("67890");
    const pubkey = BigInt("158272764195863212608952447122997478115477199482990178618439493316192225999");

    console.log("Inputs:");
    console.log("  amount:", amount.toString());
    console.log("  token:", token.toString()); 
    console.log("  salt:", salt.toString());
    console.log("  pubkey:", pubkey.toString());

    // Check if the order matches what we expect
    const commitment = poseidon4([amount, token, salt, pubkey]);
    console.log("Commitment:", commitment.toString());
    
    // Check if we get same result as spend.js
    const { SpendProver } = require('./spend');
    const prover = new SpendProver();
    const jsCommitment = prover.generateCommitment(
        amount.toString(), 
        token.toString(), 
        salt.toString(), 
        pubkey.toString()
    );
    
    console.log("JS Commitment:", jsCommitment);
    console.log("Match:", commitment.toString() === jsCommitment ? "✅" : "❌");

    // Test nullifier calculation
    const privkey = BigInt("12345");
    const nullifier = poseidon2([privkey, salt]);
    const jsNullifier = prover.generateNullifier(privkey.toString(), salt.toString());
    
    console.log("\nNullifier Test:");
    console.log("Direct:", nullifier.toString());
    console.log("JS:", jsNullifier);
    console.log("Match:", nullifier.toString() === jsNullifier ? "✅" : "❌");
}

if (require.main === module) {
    testMinimal();
}