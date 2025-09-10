const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const { poseidon2, poseidon4 } = require("poseidon-lite");

/**
 * SpendProver - Generate and verify spend proofs for private transfers
 * Handles the complex spend circuit with Merkle proofs, nullifiers, and note generation
 */
class SpendProver {
    constructor() {
        this.circuitPath = path.join(__dirname, "../build");
        this.wasmPath = path.join(this.circuitPath, "spend_js/spend.wasm");
        this.zkeyPath = path.join(this.circuitPath, "spend.zkey");
        this.vkeyPath = path.join(this.circuitPath, "spend.vkey.json");
    }

    /**
     * Generate spend proof
     * @param {Object} inputs - Spend proof inputs
     * @param {string} inputs.root - Merkle root
     * @param {string} inputs.nullifier - Computed nullifier
     * @param {string} inputs.token - Token address
     * @param {string} inputs.denominationId - Denomination ID
     * @param {string} inputs.newCommitment - Output commitment
     * @param {string} inputs.amount - Input note amount (private)
     * @param {string} inputs.salt - Input note salt (private)
     * @param {string} inputs.privkey - Private key (private)
     * @param {Array} inputs.pathElements - Merkle proof path (private)
     * @param {Array} inputs.pathIndices - Merkle proof indices (private)
     * @param {string} inputs.newAmount - Output amount (private)
     * @param {string} inputs.newSalt - Output salt (private)
     * @param {string} inputs.newPubkey - Output recipient pubkey (private)
     * @returns {Object} Proof data with public signals
     */
    async generateProof(inputs) {
        try {
            console.log("🔧 Generating spend proof witness...");
            
            // Validate inputs
            this._validateSpendInputs(inputs);
            
            // Check if circuit files exist
            if (!this._circuitFilesExist()) {
                throw new Error("Spend circuit not built. Run: bash scripts/build-circuits.sh");
            }

            // Generate proof using snarkjs
            console.log("⚡ Computing ZK proof (this may take a while for complex spend circuit)...");
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                inputs,
                this.wasmPath,
                this.zkeyPath
            );

            console.log("✅ Spend proof generated successfully");
            console.log("📊 Public signals:", publicSignals);

            return {
                proof: proof,           // Keep original format for verification
                publicSignals,
                // Decoded public signals for convenience
                root: inputs.root,
                nullifier: inputs.nullifier,
                token: inputs.token,
                denominationId: inputs.denominationId,
                newCommitment: inputs.newCommitment
            };
        } catch (error) {
            console.error("❌ Error generating spend proof:", error);
            throw error;
        }
    }

    /**
     * Verify spend proof
     * @param {Object} proofData - Proof data from generateProof
     * @returns {boolean} True if proof is valid
     */
    async verifyProof(proofData) {
        try {
            if (!fs.existsSync(this.vkeyPath)) {
                console.log("⚠️ Verification key not found, skipping verification");
                return false;
            }

            const vKey = JSON.parse(fs.readFileSync(this.vkeyPath));
            const isValid = await snarkjs.groth16.verify(vKey, proofData.publicSignals, proofData.proof);
            
            console.log(`Verification result: ${isValid ? "✅ Valid" : "❌ Invalid"}`);
            return isValid;
        } catch (error) {
            console.error("❌ Error verifying spend proof:", error);
            return false;
        }
    }

    /**
     * Generate nullifier from private key and salt
     * @param {string} privkey - Private key
     * @param {string} salt - Note salt
     * @returns {string} Nullifier hash
     */
    generateNullifier(privkey, salt) {
        return poseidon2([BigInt(privkey), BigInt(salt)]).toString();
    }

    /**
     * Generate commitment for input or output note
     * @param {string} amount - Note amount
     * @param {string} token - Token address
     * @param {string} salt - Note salt
     * @param {string} pubkey - Public key
     * @returns {string} Commitment hash
     */
    generateCommitment(amount, token, salt, pubkey) {
        const inputs = [
            BigInt(amount),
            BigInt(token),
            BigInt(salt),
            BigInt(pubkey)
        ];
        
        return poseidon4(inputs).toString();
    }

    /**
     * Generate random salt for new notes
     * @returns {string} Random field element
     */
    generateSalt() {
        const crypto = require("crypto");
        const randomBytes = crypto.randomBytes(31); // Use 31 bytes to stay under field size
        return BigInt("0x" + randomBytes.toString("hex")).toString();
    }

    /**
     * Derive public key from private key (simplified to match circuit for testing)
     * @param {string} privkey - Private key
     * @returns {string} Public key
     */
    derivePublicKey(privkey) {
        // Temporary: use same logic as circuit for testing
        // TODO: Replace with proper BabyJubJub after testing
        const pk = BigInt(privkey);
        return (pk * pk).toString(); // Same as circuit: privkey * privkey
    }

    /**
     * Create valid Merkle proof for testing that matches circuit logic
     * @param {string} leaf - Leaf to prove inclusion of
     * @param {number} depth - Tree depth (default 32)
     * @returns {Object} Valid Merkle proof
     */
    createMockMerkleProof(leaf, depth = 32) {
        const pathElements = [];
        const pathIndices = [];
        
        let currentHash = BigInt(leaf);
        
        for (let i = 0; i < depth; i++) {
            // Generate deterministic sibling based on level and leaf
            const sibling = BigInt((Number(leaf) % 1000000) + (i * 1000) + 100);
            pathElements.push(sibling.toString());
            
            // Use deterministic path (alternating for simplicity)
            const pathIndex = i % 2;
            pathIndices.push(pathIndex.toString());
            
            // Use exact same logic as circuit:
            // left = (1 - pathIndex) * current + pathIndex * sibling
            // right = pathIndex * current + (1 - pathIndex) * sibling
            const left = (1n - BigInt(pathIndex)) * currentHash + BigInt(pathIndex) * sibling;
            const right = BigInt(pathIndex) * currentHash + (1n - BigInt(pathIndex)) * sibling;
            
            currentHash = poseidon2([left, right]);
        }
        
        return {
            root: currentHash.toString(),
            pathElements,
            pathIndices
        };
    }

    /**
     * Validate spend inputs
     * @private
     */
    _validateSpendInputs(inputs) {
        const required = [
            'root', 'nullifier', 'token', 'denominationId', 'newCommitment',
            'amount', 'salt', 'privkey', 'pathElements', 'pathIndices',
            'newAmount', 'newSalt', 'newPubkey'
        ];
        
        for (const field of required) {
            if (inputs[field] === undefined || inputs[field] === null) {
                throw new Error(`Missing required input: ${field}`);
            }
        }

        // Validate array lengths
        if (inputs.pathElements.length !== 32 || inputs.pathIndices.length !== 32) {
            throw new Error("Merkle proof arrays must have length 32");
        }

        // Validate conservation constraint
        if (inputs.amount !== inputs.newAmount) {
            throw new Error(`Amount conservation violated: ${inputs.amount} !== ${inputs.newAmount}`);
        }

        // Validate nullifier matches computation
        const expectedNullifier = this.generateNullifier(inputs.privkey, inputs.salt);
        if (inputs.nullifier !== expectedNullifier) {
            throw new Error(`Nullifier mismatch: expected ${expectedNullifier}, got ${inputs.nullifier}`);
        }

        // Validate output commitment
        const expectedOutputCommitment = this.generateCommitment(
            inputs.newAmount,
            inputs.token,
            inputs.newSalt,
            inputs.newPubkey
        );
        if (inputs.newCommitment !== expectedOutputCommitment) {
            throw new Error(`Output commitment mismatch: expected ${expectedOutputCommitment}, got ${inputs.newCommitment}`);
        }
    }

    /**
     * Check if circuit files exist
     * @private
     */
    _circuitFilesExist() {
        return fs.existsSync(this.wasmPath) && fs.existsSync(this.zkeyPath);
    }
}

module.exports = { SpendProver };