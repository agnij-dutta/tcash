# Tsunami: Private & Compliant Trading Wallet

A privacy-preserving trading wallet leveraging AvaCloud's Encrypted ERC (EERC) token standard and Uniswap v4 for private, compliant DeFi operations.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Tsunami        │    │   AvaCloud      │
│   (React/Next)  │    │   Contracts      │    │   EERC          │
│                 │    │                  │    │   Infrastructure│
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • EERC SDK      │◄──►│ • PrivacyRouter  │◄──►│ • EERC Converter│
│ • ZK Circuits   │    │ • ShieldedVault  │    │ • ZK Verifiers  │
│ • Key Management│    │ • Compliance     │    │ • Auditor Keys  │
│ • UI Components │    │ • Recipient Enc. │    │ • Circuit URLs  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Features

- **Token-Layer Privacy**: Encrypted balances and confidential transfers via AvaCloud EERC
- **Regulatory Compliance**: USD threshold enforcement with Chainlink price feeds
- **Zero-Knowledge Proofs**: ZK-SNARKs for privacy-preserving verification
- **Auditor Oversight**: Designated auditor keys for compliance decryption
- **Uniswap v4 Integration**: Private swaps through Uniswap v4 PoolManager
- **Emergency Controls**: Pausable contracts for emergency stops

## Contracts

### Core Contracts

- **`PrivacyRouter`**: Handles private swaps and EERC deposits/withdrawals
- **`ShieldedVault`**: Manages token custody and nullifier tracking
- **`ComplianceOracleChainlink`**: Enforces USD thresholds using Chainlink feeds

### Libraries

- **`EERCRecipientEncoder`**: Encodes recipient data for EERC operations
- **`IncrementalMerkleTree`**: Manages commitment trees for nullifier tracking
- **`PoseidonT3`**: Poseidon hashing for Merkle tree operations

### Interfaces

- **`IEERCConverter`**: AvaCloud EERC Converter interface
- **`IComplianceOracle`**: Compliance checking interface
- **`IAggregatorV3`**: Chainlink price feed interface

## Configuration

### Network Configuration

See `config/networks.json` for per-network settings:
- EERC Converter addresses
- ZK circuit URLs
- Auditor public keys
- RPC endpoints

### Compliance Configuration

See `config/compliance.json` for token-specific settings:
- Price feed addresses
- USD thresholds
- Token decimals

## Development

### Prerequisites

- Foundry
- Node.js 18+
- Git

### Setup

```bash
# Clone repository
git clone <repository-url>
cd tcash/web3

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test
```

### Deployment

```bash
# Deploy to testnet
forge script script/Deploy.s.sol --rpc-url $FUJI_RPC_URL --broadcast --verify

# Deploy to mainnet
forge script script/Deploy.s.sol --rpc-url $AVAX_RPC_URL --broadcast --verify
```

## Integration with AvaCloud EERC

### 1. EERC Converter Setup

Deploy or configure AvaCloud's EERC Converter contract:

```solidity
// Set converter address
privacyRouter.setConverter(converterAddress);

// Set auditor public key
converter.setAuditorPublicKey(auditorPubKeyX, auditorPubKeyY);
```

### 2. User Registration

Users must register with the EERC Converter before using private features:

```typescript
import { EERCSDK } from '@avacloud/eerc-sdk';

const eercSDK = new EERCSDK({
  chainId: 43114,
  converterAddress: '0x...',
  circuitUrls: { /* ... */ }
});

// Register user
await eercSDK.register(registrationProof);
```

### 3. Private Operations

#### Private Transfer
```typescript
// Transfer between private balances
await eercSDK.transfer(recipientData, amount, transferProof);
```

#### Public to Private (Mint)
```typescript
// Convert public ERC20 to private EERC
await eercSDK.mint(token, amount, recipientData, mintProof);
```

#### Private to Public (Withdraw)
```typescript
// Convert private EERC to public ERC20
await eercSDK.withdraw(token, amount, recipient, withdrawProof);
```

### 4. Compliance Integration

Configure compliance thresholds per token:

```typescript
// Set USDC threshold to $1000
complianceOracle.setTokenConfig(
  usdcAddress,
  usdcPriceFeed,
  6, // decimals
  ethers.parseEther("1000") // $1000 threshold
);
```

## Security Considerations

### Key Management
- Secure generation and storage of BabyJubjub keys
- Auditor key rotation procedures
- Multi-signature wallet for contract ownership

### Compliance
- Regular threshold updates
- Audit trail maintenance
- Regulatory reporting integration

### Privacy
- Zero-knowledge proof verification
- Encrypted data handling
- No plaintext balance exposure

## Testing

### Unit Tests
```bash
# Run all tests
forge test

# Run specific test
forge test --match-contract PrivacyRouterTest

# Run with gas reporting
forge test --gas-report
```

### Integration Tests
```bash
# Run integration tests
forge test --match-path "test/integration/*"
```

## Monitoring

### Events
- `SpendRecorded`: Private spend executed
- `SwapExecuted`: Uniswap swap completed
- `DepositedToEERC`: Public to private conversion
- `WithdrawnFromEERC`: Private to public conversion

### Metrics
- Transaction success rates
- Compliance approval rates
- Gas usage optimization
- Circuit verification performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- Documentation: [docs.avacloud.io](https://docs.avacloud.io/encrypted-erc)
- SDK: [@avacloud/eerc-sdk](https://github.com/ava-labs/ac-eerc-sdk)
- Issues: [GitHub Issues](https://github.com/your-org/tcash/issues)

## Roadmap

- [ ] Complete AvaCloud EERC integration
- [ ] Uniswap v4 hook development
- [ ] Frontend SDK integration
- [ ] Multi-chain support
- [ ] Advanced compliance features
- [ ] Mobile app development
