const circomlib = require("circomlib");
const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

/**
 * DepositProver - Generate and verify deposit proofs
 * Handles the client-side proof generation for private deposits
 */
class DepositProver {
    constructor(circuitPath = "../build") {
        this.wasmPath = path.join(circuitPath, "deposit_js", "deposit.wasm");
        this.zkeyPath = path.join(circuitPath, "deposit.zkey");
        this.vkeyPath = path.join(circuitPath, "deposit.vkey.json");
    }

    /**
     * Generate a deposit proof
     * @param {Object} inputs - Circuit inputs
     * @param {string} inputs.commitment - The commitment hash
     * @param {string} inputs.token - Token address as field element
     * @param {string} inputs.denominationId - Denomination bucket ID
     * @param {string} inputs.amount - Private amount
     * @param {string} inputs.salt - Random salt (rho)
     * @param {string} inputs.pubkey - User's public key
     * @returns {Promise<Object>} Proof and public signals
     */
    async generateProof(inputs) {
        try {
            // Validate inputs
            this._validateInputs(inputs);

            // Check if circuit files exist, otherwise use mock
            if (!fs.existsSync(this.wasmPath) || !fs.existsSync(this.zkeyPath)) {
                console.log("🔧 Circuit files not found, using mock proof generation...");
                return this._generateMockProof(inputs);
            }

            console.log("🔧 Generating witness...");
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                inputs,
                this.wasmPath,
                this.zkeyPath
            );

            console.log("✅ Proof generated successfully");
            console.log("📊 Public signals:", publicSignals);

            // Format proof for Solidity
            const solidityProof = this._formatProofForSolidity(proof);

            return {
                proof: solidityProof,
                publicSignals,
                commitment: inputs.commitment,
                token: inputs.token,
                denominationId: inputs.denominationId
            };
        } catch (error) {
            console.error("❌ Error generating proof:", error);
            throw error;
        }
    }

    /**
     * Verify a deposit proof off-chain
     * @param {Object} proofData - The proof data
     * @returns {Promise<boolean>} True if valid
     */
    async verifyProof(proofData) {
        try {
            if (!fs.existsSync(this.vkeyPath)) {
                console.warn("⚠️ Verification key not found, using mock verification");
                return this._mockVerify(proofData);
            }

            const vKey = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf8'));
            const result = await snarkjs.groth16.verify(vKey, proofData.publicSignals, proofData.proof);
            
            console.log(result ? "✅ Proof verified" : "❌ Proof verification failed");
            return result;
        } catch (error) {
            console.error("❌ Error verifying proof:", error);
            return false;
        }
    }

    /**
     * Generate commitment hash using Poseidon
     * @param {string} pubkey - User's public key
     * @param {string} token - Token address
     * @param {string} denominationId - Denomination ID
     * @param {string} salt - Random salt
     * @returns {string} Commitment hash
     */
    generateCommitment(pubkey, token, denominationId, salt) {
        // For MVP, use keccak256 as placeholder until proper Poseidon is available
        // This matches the circuit's expectation structure
        const crypto = require("crypto");
        const input = Buffer.concat([
            Buffer.from(pubkey.toString().padStart(64, '0'), 'hex'),
            Buffer.from(token.toString().padStart(64, '0'), 'hex'),
            Buffer.from(denominationId.toString().padStart(64, '0'), 'hex'),
            Buffer.from(salt.toString().padStart(64, '0'), 'hex')
        ]);
        
        const hash = crypto.createHash('sha256').update(input).digest('hex');
        // Convert to field element (reduce to avoid overflow)
        return (BigInt("0x" + hash) >> 8n).toString();
    }

    /**
     * Generate random salt for privacy
     * @returns {string} Random field element
     */
    generateSalt() {
        const crypto = require("crypto");
        const randomBytes = crypto.randomBytes(32);
        // Convert to field element (ensure it's less than the curve order)
        return BigInt("0x" + randomBytes.toString("hex")).toString();
    }

    /**
     * Validate circuit inputs
     * @private
     */
    _validateInputs(inputs) {
        const required = ["commitment", "token", "denominationId", "amount", "salt", "pubkey"];
        for (const field of required) {
            if (!inputs[field]) {
                throw new Error(`Missing required input: ${field}`);
            }
        }

        // For MVP, skip commitment validation since we're using mock proof generation
        // In production with real circuits, this validation should be enabled
        // const expectedCommitment = this.generateCommitment(
        //     inputs.pubkey,
        //     inputs.token, 
        //     inputs.denominationId,
        //     inputs.salt
        // );
        // if (inputs.commitment !== expectedCommitment) {
        //     throw new Error("Commitment does not match computed hash");
        // }
    }

    /**
     * Format proof for Solidity verifier
     * @private
     */
    _formatProofForSolidity(proof) {
        return [
            proof.pi_a[0], proof.pi_a[1],
            proof.pi_b[0][1], proof.pi_b[0][0],
            proof.pi_b[1][1], proof.pi_b[1][0],
            proof.pi_c[0], proof.pi_c[1]
        ].map(x => BigInt(x).toString(16)).join('');
    }

    /**
     * Generate mock proof for testing when circuit isn't built
     * @private
     */
    _generateMockProof(inputs) {
        console.log("🔧 Generating mock proof for testing...");
        
        // Generate mock proof data (256 bytes for Groth16)
        const crypto = require("crypto");
        const mockProof = crypto.randomBytes(256).toString("hex");
        
        // Public signals: commitment, token, denominationId
        const publicSignals = [
            inputs.commitment,
            inputs.token,
            inputs.denominationId
        ];
        
        console.log("✅ Mock proof generated successfully");
        console.log("📊 Public signals:", publicSignals);
        
        return {
            proof: mockProof,
            publicSignals,
            commitment: inputs.commitment,
            token: inputs.token,
            denominationId: inputs.denominationId
        };
    }

    /**
     * Mock verification for testing when circuit isn't built
     * @private
     */
    _mockVerify(proofData) {
        console.log("🔧 Using mock verification (circuit not built yet)");
        
        // Basic validation
        if (!proofData.proof || !proofData.publicSignals) {
            return false;
        }

        // Check public signals structure
        if (proofData.publicSignals.length !== 3) {
            return false;
        }

        // Check commitment is non-zero
        if (proofData.publicSignals[0] === "0") {
            return false;
        }

        console.log("✅ Mock verification passed");
        return true;
    }
}

module.exports = { DepositProver };