#!/bin/bash

set -e

# Configuration
CIRCUITS_DIR="circuits"
BUILD_DIR="build"
SETUP_DIR="setup"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Building Tsunami ZK Circuits...${NC}"

# Create directories
mkdir -p $BUILD_DIR $SETUP_DIR

# Use our locally generated powers of tau file
PTAU_FILE="$SETUP_DIR/pot15_final.ptau"
if [ ! -f "$PTAU_FILE" ]; then
    echo -e "${RED}❌ Powers of tau file not found at $PTAU_FILE${NC}"
    echo -e "${YELLOW}Please run the powers of tau ceremony first${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Using powers of tau: $PTAU_FILE${NC}"

# Function to build a single circuit
build_circuit() {
    local circuit=$1
    echo -e "${YELLOW}🔧 Building $circuit circuit...${NC}"
    
    # Check if circuit exists
    if [ ! -f "$CIRCUITS_DIR/$circuit.circom" ]; then
        echo -e "${RED}❌ Circuit $CIRCUITS_DIR/$circuit.circom not found${NC}"
        return 1
    fi
    
    # Compile circuit
    echo -e "  🔨 Compiling circuit..."
    circom $CIRCUITS_DIR/$circuit.circom --r1cs --wasm --sym -o $BUILD_DIR/ -l node_modules/
    
    # Setup (using beta-1 for hackathon speed)
    echo -e "  🔑 Generating proving and verification keys..."
    npx snarkjs groth16 setup \
        $BUILD_DIR/$circuit.r1cs \
        $PTAU_FILE \
        $BUILD_DIR/$circuit.zkey
    
    # Export verification key
    echo -e "  📄 Exporting verification key..."
    npx snarkjs zkey export verificationkey \
        $BUILD_DIR/$circuit.zkey \
        $BUILD_DIR/$circuit.vkey.json
    
    # Generate Solidity verifier
    echo -e "  📜 Generating Solidity verifier..."
    npx snarkjs zkey export solidityverifier \
        $BUILD_DIR/$circuit.zkey \
        contracts/verifiers/${circuit^}Verifier.sol
    
    # Update contract with proper naming
    sed -i "s/contract Verifier/contract ${circuit^}Verifier/g" contracts/verifiers/${circuit^}Verifier.sol
    
    echo -e "${GREEN}✅ $circuit circuit built successfully${NC}"
}

# Build circuits
for circuit in deposit; do
    build_circuit $circuit
done

echo -e "${GREEN}🎉 All circuits compiled successfully!${NC}"
echo -e "${YELLOW}📁 Generated files:${NC}"
echo -e "  - Build artifacts: $BUILD_DIR/"
echo -e "  - Solidity verifiers: contracts/verifiers/"
echo -e "  - Verification keys: $BUILD_DIR/*.vkey.json"