# Tsunami Compliance Oracle

## Quick Start

The Tsunami Compliance Oracle is a critical component that enables privacy-preserving compliance for withdrawals. It supports both simple threshold-based compliance and advanced zk-attestation verification.

## Core Functionality

### 🔍 What it does:
- **Threshold Checking**: Automatically approve small withdrawals (< $10K default)
- **Attestation Verification**: Verify zk-proofs for large withdrawals without revealing user identity
- **Provider Management**: Support multiple KYC/identity providers (Polygon ID, Worldcoin, etc.)
- **Replay Protection**: Prevent reuse of attestations

### 🏗️ Architecture:
```
User Request → Vault → Oracle → Decision (Allow/Deny)
                  ↓
    [Check Threshold + Optional Attestation Verification]
```

## Installation

```bash
# Install dependencies
forge install

# Compile contracts
forge build

# Run tests  
forge test --match-contract ComplianceOracle
```

## Deployment

### MVP (Simple Threshold-only)
```bash
# Deploy basic oracle
ENVIRONMENT=MVP forge script script/DeployOracle.s.sol --broadcast

# Or manually:
ComplianceOracleStub oracle = new ComplianceOracleStub();
oracle.setThreshold(USDC_ADDRESS, 10_000e18); // $10K threshold
```

### Full (With Attestations)
```bash
# Deploy full oracle
ENVIRONMENT=FULL forge script script/DeployOracle.s.sol --broadcast

# Configure providers
ORACLE_ADDRESS=0x... NEW_PROVIDER=0x... ATTESTATION_TYPE=0 forge script script/DeployOracle.s.sol:ConfigureOracle --broadcast
```

## Usage

### Basic Withdrawal (< Threshold)
```solidity
// Automatic approval for small amounts
vault.withdraw(proof, root, nullifier, token, smallAmount, recipient);
```

### Large Withdrawal (> Threshold) 
```solidity
// Requires attestation proof
bytes memory kycProof = generateKYCAttestation(user);
vault.withdrawWithAttestation(
    proof, root, nullifier, 
    token, largeAmount, recipient,
    ATTESTATION_TYPE_KYC, kycProof
);
```

### Oracle Configuration
```solidity
// Set thresholds
oracle.setThreshold(USDC, 10_000e18); // $10K for USDC

// Add KYC provider
oracle.addAttestationProvider(ATTESTATION_TYPE_KYC, polygonIDProvider);

// Check if attestation needed
bool needsAttestation = oracle.requiresAttestation(USDC, 50_000e18); // true
```

## Attestation Types

| Type | ID | Description | Example Providers |
|------|----|-----------|--------------------|
| KYC | 0 | Know Your Customer verification | Polygon ID, Worldcoin |
| Sanctions | 1 | Sanctions list checking | Chainalysis, TRM Labs |
| Identity | 2 | Government ID verification | Civic, SelfKey |

## API Reference

### Core Functions

```solidity
interface IComplianceOracle {
    // Check if withdrawal allowed (basic threshold)
    function isExitAllowed(address token, uint256 amount) external view returns (bool);
    
    // Verify zk-attestation proof  
    function verifyAttestationProof(
        address user, 
        uint8 attestationType, 
        bytes calldata proof, 
        uint256 amount
    ) external view returns (bool);
    
    // Check if attestation required
    function requiresAttestation(address token, uint256 amount) external view returns (bool);
}
```

### Admin Functions

```solidity
// Threshold management
function setThreshold(address token, uint256 usdThreshold) external onlyOwner;

// Provider management  
function addAttestationProvider(uint8 attestationType, address provider) external onlyOwner;
function removeAttestationProvider(uint8 attestationType, address provider) external onlyOwner;

// Configuration
function setAttestationValidityPeriod(uint256 period) external onlyOwner;
```

## Testing

```bash
# Run all oracle tests
forge test --match-contract ComplianceOracleTest -v

# Run specific test categories
forge test --match-test "testThreshold" -v     # Threshold tests
forge test --match-test "testAttestation" -v   # Attestation tests
forge test --match-test "testProvider" -v      # Provider management tests

# Run with gas reports
forge test --match-contract ComplianceOracle --gas-report
```

## Security Considerations

### ✅ Security Features
- **Access Control**: Owner-only admin functions
- **Replay Protection**: Prevents attestation reuse  
- **Expiration Checking**: Attestations have validity periods
- **Provider Whitelist**: Only approved providers accepted
- **Signature Verification**: Provider signatures validated

### ⚠️ Production Notes
- Implement proper ECDSA signature verification
- Consider multi-sig for oracle ownership
- Regular security audits recommended
- Monitor for suspicious patterns

## Integration Guide

### With ShieldedVault
```solidity
// 1. Deploy oracle
ComplianceOracle oracle = new ComplianceOracle();

// 2. Configure vault
vault.setComplianceOracle(address(oracle));

// 3. Set thresholds
oracle.setThreshold(USDC, 10_000e18);

// 4. Add providers
oracle.addAttestationProvider(ATTESTATION_TYPE_KYC, kycProvider);
```

### With Frontend
```javascript
// Check if attestation needed
const needsAttestation = await oracle.requiresAttestation(tokenAddress, amount);

if (needsAttestation) {
    // Generate attestation proof
    const proof = await generateKYCProof(user);
    
    // Use attestation withdrawal
    await vault.withdrawWithAttestation(
        zkProof, root, nullifier, 
        token, amount, recipient,
        ATTESTATION_TYPE_KYC, proof
    );
} else {
    // Use normal withdrawal
    await vault.withdraw(zkProof, root, nullifier, token, amount, recipient);
}
```

## Troubleshooting

### Common Issues

**"NotOwner" Error**
- Ensure you're calling admin functions from the owner address

**"InvalidProvider" Error**  
- Provider must be added via `addAttestationProvider()` first

**"AttestationExpired" Error**
- Generate fresh attestation proof

**"InsufficientAttestation" Error**
- Amount exceeds threshold, need valid attestation

### Debug Commands
```bash
# Check oracle config
cast call $ORACLE_ADDRESS "getThreshold(address)(uint256)" $TOKEN_ADDRESS

# Check if provider approved
cast call $ORACLE_ADDRESS "isProviderApproved(uint8,address)(bool)" 0 $PROVIDER_ADDRESS

# Check attestation requirement
cast call $ORACLE_ADDRESS "requiresAttestation(address,uint256)(bool)" $TOKEN_ADDRESS $AMOUNT
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add comprehensive tests
4. Ensure all tests pass: `forge test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
