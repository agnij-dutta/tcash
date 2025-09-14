# Deployment Instructions

## Quick Deploy (Using Your Private Key)

**⚠️ WARNING: This method exposes your private key in the script. Use only for testing!**

```bash
# Deploy contracts to Avalanche Fuji testnet
forge script script/DeployV3Integration.s.sol:DeployV3IntegrationScript \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --broadcast \
  --verify
```

## Safe Deploy (Recommended)

1. **Setup environment file:**
```bash
cp env.example .env
# Edit .env and add your private key:
# PRIVATE_KEY=95492791d9e40b7771b8b57117c399cc5e27d99d4959b7f9592925a398be7bdb
```

2. **Deploy contracts:**
```bash
source .env
forge script script/DeployV3Safe.s.sol:DeployV3SafeScript \
  --rpc-url $FUJI_RPC_URL \
  --broadcast \
  --verify
```

## What Gets Deployed

### Core Contracts
1. **ComplianceOracleChainlink** - Handles regulatory compliance
2. **ShieldedVault** - Manages ZK proofs and token custody
3. **PrivacyV3Router** - Routes private swaps through Uniswap V3

### Configuration
- **Supported Tokens**: USDC and WAVAX on Fuji
- **USDC Denominations**: $100, $500, $1000, $5000
- **AVAX Denominations**: 1, 5, 10, 50 AVAX
- **Uniswap V3 Integration**: Factory and Quoter contracts
- **EERC Converter**: Connected for privacy deposits

## Post-Deployment Steps

1. **Fund the vault** with tokens for spend operations
2. **Test the integration** using your frontend
3. **Verify contract addresses** on Snowtrace
4. **Monitor compliance** oracle for regulatory requirements

## Contract Addresses (Fuji Testnet)

After deployment, update these in your frontend:

```javascript
// Will be populated after deployment
const CONTRACTS = {
  COMPLIANCE_ORACLE: "0x...",
  SHIELDED_VAULT: "0x...",
  PRIVACY_V3_ROUTER: "0x...",
  EERC_CONVERTER: "0x372dAB27c8d223Af11C858ea00037Dc03053B22E"
};
```

## Integration Points

### Uniswap V3 (Fuji)
- **Factory**: `0x1F98431c8aD98523631AE4a59f267346ea31F984`
- **Quoter**: `0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6`

### Tokens (Fuji)
- **USDC**: `0x5425890298aed601595a70AB815c96711a31Bc65`
- **WAVAX**: `0xd00ae08403B9bbb9124bB305C09058E32C39A48c`

## Testing the Deployment

```bash
# Run integration tests against deployed contracts
forge test --match-contract "EndToEndV3Swap" --fork-url https://api.avax-test.network/ext/bc/C/rpc
```

## Troubleshooting

- **"insufficient funds"**: Get AVAX from [Avalanche Faucet](https://faucet.avax.network/)
- **"nonce too low"**: Wait a few blocks and retry
- **"contract creation failed"**: Check gas settings and network connection

## Security Notes

- ✅ Private keys stored in environment variables
- ✅ Access control configured (vault ↔ router relationship)
- ✅ Supported tokens allowlist enabled
- ✅ Denomination buckets for privacy pools
- ⚠️ This is testnet deployment - use additional security measures for mainnet