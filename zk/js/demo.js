const { DepositProver } = require('./deposit');

/**
 * Demo script showing how to generate deposit proofs
 * This simulates the client-side proof generation workflow
 */
async function demoDepositProof() {
    console.log("🌊 Tsunami ZK Deposit Proof Demo");
    console.log("================================");

    try {
        // Initialize prover
        const prover = new DepositProver();

        // Simulate user deposit parameters
        const token = "0x1234567890123456789012345678901234567890"; // Mock USDC address
        const amount = "1000000000000000000"; // 1 ETH worth
        const denominationId = "1"; // Bucket ID
        const pubkey = "12345678901234567890"; // User's public key
        const salt = prover.generateSalt(); // Random privacy salt

        console.log("📋 Deposit Parameters:");
        console.log("  Token:", token);
        console.log("  Amount:", amount);
        console.log("  Denomination ID:", denominationId);
        console.log("  Public Key:", pubkey);
        console.log("  Salt:", salt);

        // Generate commitment
        const commitment = prover.generateCommitment(pubkey, token, denominationId, salt);
        console.log("  Commitment:", commitment);

        // Prepare circuit inputs
        const inputs = {
            // Public inputs
            commitment,
            token: BigInt(token).toString(), // Convert address to field element
            denominationId,
            
            // Private inputs
            amount,
            salt,
            pubkey
        };

        console.log("\n🔐 Generating ZK Proof...");
        console.log("This proves knowledge of commitment preimage without revealing:");
        console.log("  - Amount (private)");
        console.log("  - Salt (private)");
        console.log("  - Public Key (private)");

        // Generate proof (will use mock for now since circuit isn't fully built)
        const proofData = await prover.generateProof(inputs);

        console.log("\n✅ Proof Generated!");
        console.log("📊 Proof Data:");
        console.log("  Proof length:", proofData.proof.length, "bytes");
        console.log("  Public signals:", proofData.publicSignals);

        // Verify proof
        console.log("\n🔍 Verifying Proof...");
        const isValid = await prover.verifyProof(proofData);
        console.log("Verification result:", isValid ? "✅ Valid" : "❌ Invalid");

        // Show contract interaction format
        console.log("\n📄 Contract Interaction Format:");
        console.log("ShieldedVault.deposit(");
        console.log(`  "${token}",`);
        console.log(`  "${amount}",`);
        console.log(`  "${proofData.commitment}",`);
        console.log(`  ${proofData.denominationId},`);
        console.log(`  "0x${proofData.proof}"`);
        console.log(");");

        return proofData;
    } catch (error) {
        console.error("❌ Demo failed:", error.message);
        throw error;
    }
}

// Run demo if called directly
if (require.main === module) {
    demoDepositProof()
        .then(() => {
            console.log("\n🎉 Demo completed successfully!");
            process.exit(0);
        })
        .catch(error => {
            console.error("💥 Demo failed:", error);
            process.exit(1);
        });
}

module.exports = { demoDepositProof };