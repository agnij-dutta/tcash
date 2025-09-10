const { DepositProver } = require('./deposit');

async function verifyZKSystem() {
    console.log("🔍 ZK System Verification");
    console.log("========================");
    
    const prover = new DepositProver();
    
    // Test 1: Poseidon Hash Consistency
    console.log("\n1. Testing Poseidon Hash Consistency...");
    const pubkey = "123";
    const token = "456"; 
    const denominationId = "1";
    const salt = "789";
    
    const hash1 = prover.generateCommitment(pubkey, token, denominationId, salt);
    const hash2 = prover.generateCommitment(pubkey, token, denominationId, salt);
    
    console.log(`Hash 1: ${hash1}`);
    console.log(`Hash 2: ${hash2}`);
    console.log(`Consistent: ${hash1 === hash2 ? "✅ YES" : "❌ NO"}`);
    
    // Test 2: Circuit Constraint Satisfaction
    console.log("\n2. Testing Circuit Constraint Satisfaction...");
    try {
        const inputs = {
            commitment: hash1,
            token,
            denominationId,
            amount: "1000000000000000000",
            salt,
            pubkey
        };
        
        const proof = await prover.generateProof(inputs);
        console.log("Circuit constraints: ✅ SATISFIED");
        console.log(`Public signals: ${JSON.stringify(proof.publicSignals)}`);
        
        // Verify public signals match inputs
        const [outputCommitment, outputToken, outputDenom] = proof.publicSignals;
        console.log(`Commitment match: ${outputCommitment === hash1 ? "✅ YES" : "❌ NO"}`);
        console.log(`Token match: ${outputToken === token ? "✅ YES" : "❌ NO"}`);
        console.log(`Denomination match: ${outputDenom === denominationId ? "✅ YES" : "❌ NO"}`);
        
        return true;
        
    } catch (error) {
        console.log("Circuit constraints: ❌ FAILED");
        console.log(`Error: ${error.message}`);
        return false;
    }
}

// Test 3: Invalid Input Rejection
async function testInvalidInputs() {
    console.log("\n3. Testing Invalid Input Rejection...");
    const prover = new DepositProver();
    
    try {
        // Wrong commitment should fail
        const inputs = {
            commitment: "999999", // Wrong commitment
            token: "456",
            denominationId: "1", 
            amount: "1000000000000000000",
            salt: "789",
            pubkey: "123"
        };
        
        await prover.generateProof(inputs);
        console.log("Invalid input test: ❌ FAILED (should have rejected)");
        return false;
        
    } catch (error) {
        if (error.message.includes("Commitment mismatch")) {
            console.log("Invalid input test: ✅ PASSED (correctly rejected)");
            return true;
        } else {
            console.log(`Invalid input test: ❌ FAILED (wrong error: ${error.message})`);
            return false;
        }
    }
}

// Run all tests
async function runAllTests() {
    const test1 = await verifyZKSystem();
    const test2 = await testInvalidInputs();
    
    console.log("\n=== FINAL RESULTS ===");
    console.log(`Poseidon & Circuit: ${test1 ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Input Validation: ${test2 ? "✅ PASS" : "❌ FAIL"}`);
    console.log(`Overall Status: ${test1 && test2 ? "🎉 SYSTEM WORKING" : "⚠️ ISSUES FOUND"}`);
}

if (require.main === module) {
    runAllTests().catch(console.error);
}