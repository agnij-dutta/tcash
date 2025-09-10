const { SpendProver } = require('./spend');

/**
 * Simplified test focusing just on the commitment and Merkle proof
 */
async function simpleSpendTest() {
    console.log("🔍 Simple Spend Test - Focus on Commitment/Merkle");
    console.log("=================================================");

    const prover = new SpendProver();

    // Use the same values from our debug test
    const privkey = "12345";
    const amount = "1000000000000000000";
    const token = "123456789"; 
    const denominationId = "1";
    const salt = "67890";
    
    // Derive public key  
    const pubkey = prover.derivePublicKey(privkey);
    console.log("Private Key:", privkey);
    console.log("Public Key:", pubkey);
    
    // Generate input commitment EXACTLY as circuit does
    const inputCommitment = prover.generateCommitment(amount, token, salt, pubkey);
    console.log("Input Commitment:", inputCommitment);
    
    // Create Merkle proof for this exact commitment
    const merkleProof = prover.createMockMerkleProof(inputCommitment, 32);
    console.log("Merkle Root:", merkleProof.root);
    
    // Test just the input validation first
    console.log("\n🧪 Testing input validation...");
    
    const spendInputs = {
        // Public inputs
        root: merkleProof.root,
        nullifier: prover.generateNullifier(privkey, salt),
        token: token,
        denominationId: denominationId,
        newCommitment: prover.generateCommitment(amount, token, "99999", "888777"), // Different output
        
        // Private inputs  
        amount: amount,
        salt: salt,
        privkey: privkey,
        pathElements: merkleProof.pathElements,
        pathIndices: merkleProof.pathIndices,
        newAmount: amount,
        newSalt: "99999",
        newPubkey: "888777"
    };

    try {
        // Test validation
        prover._validateSpendInputs(spendInputs);
        console.log("✅ Input validation passed");
        
        // Now try proof generation with smaller depth first
        console.log("\n🔐 Testing proof generation...");
        
        // Check if the issue is with the commitment computation in circuit vs JS
        console.log("Expected commitment in circuit should be:", inputCommitment);
        console.log("Merkle proof should validate this commitment against root:", merkleProof.root);
        
        const proofData = await prover.generateProof(spendInputs);
        console.log("✅ Proof generation successful!");
        return true;
        
    } catch (error) {
        console.log("❌ Error:", error.message);
        
        // Let's debug what might be wrong
        console.log("\n🔍 Debug Info:");
        console.log("Commitment calculation uses:", [amount, token, salt, pubkey]);
        console.log("Expected Poseidon(amount, token, salt, pubkey)");
        console.log("Actual commitment:", inputCommitment);
        
        return false;
    }
}

if (require.main === module) {
    simpleSpendTest().then(success => {
        if (success) {
            console.log("\n🎉 Simple spend test passed!");
        } else {
            console.log("\n💥 Simple spend test failed");
        }
    });
}