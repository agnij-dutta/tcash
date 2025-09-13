# AvaCloud EERC Integration Plan for Tsunami

## Overview

This document outlines the complete integration of AvaCloud's Encrypted ERC (EERC) token standard into the Tsunami privacy-preserving trading wallet. EERC provides token-layer privacy through encrypted balances and confidential transfers while maintaining regulatory compliance through zero-knowledge proofs and auditor oversight.

## Current State Analysis

### What We Have
- Custom `eERC.sol` implementation (removed)
- `IEERCConverter` interface defining EERC Converter API
- `EERCRecipientEncoder` library for encoding recipient data
- `ComplianceOracleChainlink` with USD threshold enforcement
- `PrivacyRouter` and `ShieldedVault` contracts refactored for EERC integration

### What We Need
- Full AvaCloud EERC Converter contract integration
- ZK circuit artifacts (registration, transfer, mint, deposit, withdraw, burn)
- SDK integration for client-side operations
- Auditor key management
- Network configuration and deployment scripts

## Integration Architecture

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

## Implementation Plan

### Phase 1: Core Contract Integration

#### 1.1 EERC Converter Contract
- **Status**: Interface defined, need actual contract
- **Action**: Deploy or integrate AvaCloud's EERC Converter contract
- **Dependencies**: AvaCloud team provides contract address per network

#### 1.2 ZK Circuit Integration
- **Circuits Needed**:
  - `Registration`: User registration with BabyJubjub key generation
  - `Transfer`: Private transfers between encrypted balances
  - `Mint`: Converting public ERC20 to private EERC
  - `Deposit`: Adding to existing private balance
  - `Withdraw`: Converting private EERC back to public ERC20
  - `Burn`: Removing from private balance
- **Action**: Host circuit artifacts (wasm/zkey files) and configure URLs

#### 1.3 Contract Updates
- **PrivacyRouter**: Already updated for EERC deposit/withdraw flow
- **ShieldedVault**: Already refactored to remove custom eERC logic
- **ComplianceOracle**: Chainlink integration complete

### Phase 2: SDK and Client Integration

#### 2.1 EERC SDK Integration
```typescript
// Example integration
import { EERCSDK } from '@avacloud/eerc-sdk';

const eercSDK = new EERCSDK({
  chainId: 43114, // Avalanche C-Chain
  converterAddress: '0x...',
  circuitUrls: {
    registration: 'https://...',
    transfer: 'https://...',
    mint: 'https://...',
    deposit: 'https://...',
    withdraw: 'https://...',
    burn: 'https://...'
  }
});
```

#### 2.2 Key Management
- **User Keys**: BabyJubjub key pairs for encrypted operations
- **Auditor Keys**: Public keys for compliance decryption
- **Storage**: Secure key storage in browser/device

#### 2.3 UI Components
- Registration flow
- Private balance display
- Transfer interface
- Withdrawal with compliance checks

### Phase 3: Network Configuration

#### 3.1 Per-Network Setup
```json
{
  "43114": { // Avalanche C-Chain
    "converterAddress": "0x...",
    "circuitUrls": {
      "registration": "https://...",
      "transfer": "https://...",
      "mint": "https://...",
      "deposit": "https://...",
      "withdraw": "https://...",
      "burn": "https://..."
    },
    "auditorPublicKey": {
      "x": "0x...",
      "y": "0x..."
    }
  }
}
```

#### 3.2 Compliance Configuration
```json
{
  "tokens": {
    "0xA0b86a33E6441b8c4C8C0d1B4C8C0d1B4C8C0d1B": {
      "priceFeed": "0x...",
      "decimals": 6,
      "usdThreshold": "1000000000000000000000" // $1000 in wei
    }
  }
}
```

## Technical Implementation Details

### 1. Recipient Data Encoding
```solidity
// Using EERCRecipientEncoder library
bytes memory encryptedRecipientData = EERCRecipientEncoder.encode(
  chainId,
  recipientPubKeyX,
  recipientPubKeyY,
  nonce,
  metadata
);
```

### 2. EERC Operations Flow
```solidity
// 1. User registration (one-time)
converter.register(registrationProof);

// 2. Private transfer (user to user)
converter.transfer(recipientData, amount, transferProof);

// 3. Public to private (mint)
converter.mint(token, amount, recipientData, mintProof);

// 4. Private to public (withdraw with compliance)
if (compliance.isExitAllowed(token, amount)) {
  converter.withdraw(token, amount, recipient, withdrawProof);
}
```

### 3. Compliance Integration
```solidity
// USD conversion and threshold checking
function isExitAllowed(address token, uint256 amount) external view returns (bool) {
  TokenConfig memory cfg = tokenConfig[token];
  uint256 amountUsd = convertToUSD(amount, cfg.priceFeed, cfg.decimals);
  return amountUsd <= cfg.usdThreshold1e18;
}
```

## Dependencies and Blockers

### External Dependencies
1. **AvaCloud Team**: EERC Converter contract addresses per network
2. **AvaCloud Team**: ZK circuit artifacts and hosting URLs
3. **AvaCloud Team**: Auditor public key setup
4. **Roshan**: Uniswap v4 integration (separate from EERC)

### Internal Dependencies
1. **Frontend Team**: EERC SDK integration
2. **DevOps**: Circuit artifact hosting
3. **Compliance Team**: Threshold configuration

## Testing Strategy

### Unit Tests
- EERC Converter integration
- Compliance oracle USD conversion
- Recipient data encoding/decoding
- Ownership transfer functions

### Integration Tests
- End-to-end private transfer flow
- Public to private conversion
- Private to public withdrawal with compliance
- Multi-token support

### E2E Tests
- Complete user journey from registration to withdrawal
- Compliance threshold enforcement
- Error handling and edge cases

## Security Considerations

### 1. Key Management
- Secure generation and storage of BabyJubjub keys
- Auditor key rotation procedures
- Backup and recovery mechanisms

### 2. Compliance
- Regular threshold updates
- Audit trail maintenance
- Regulatory reporting integration

### 3. Privacy
- Zero-knowledge proof verification
- Encrypted data handling
- No plaintext balance exposure

## Migration Strategy

### From Custom eERC to AvaCloud EERC
1. **Phase 1**: Deploy AvaCloud EERC alongside existing system
2. **Phase 2**: Migrate users gradually with data export/import
3. **Phase 3**: Deprecate custom eERC implementation
4. **Phase 4**: Remove legacy code and dependencies

### Data Migration
- User registration data
- Private balance snapshots
- Transaction history (encrypted)
- Compliance settings

## Success Metrics

### Technical Metrics
- [ ] EERC Converter deployed and functional
- [ ] All ZK circuits operational
- [ ] SDK integration complete
- [ ] Compliance enforcement working
- [ ] End-to-end tests passing

### Business Metrics
- [ ] User registration success rate > 95%
- [ ] Private transfer success rate > 99%
- [ ] Compliance approval rate > 90%
- [ ] Average transaction time < 30 seconds

## Timeline

### Week 1-2: Core Integration
- Deploy EERC Converter contracts
- Integrate ZK circuits
- Update contract interfaces

### Week 3-4: SDK Integration
- Implement EERC SDK
- Build UI components
- Key management system

### Week 5-6: Testing & Deployment
- Comprehensive testing
- Network configuration
- Production deployment

### Week 7-8: Migration & Optimization
- User migration
- Performance optimization
- Monitoring and alerting

## Risk Mitigation

### Technical Risks
- **Circuit Verification Failures**: Implement fallback mechanisms
- **Key Loss**: Multi-signature and backup systems
- **Compliance Issues**: Regular audits and updates

### Business Risks
- **Regulatory Changes**: Flexible compliance framework
- **User Adoption**: Gradual rollout with incentives
- **Performance Issues**: Load testing and optimization

## Conclusion

The integration of AvaCloud EERC into Tsunami represents a significant upgrade in privacy and compliance capabilities. This plan provides a structured approach to implementation while maintaining security and regulatory compliance throughout the process.

The modular architecture allows for incremental deployment and testing, reducing risk while providing immediate value to users. Success depends on close collaboration with the AvaCloud team and careful attention to security and compliance requirements.
