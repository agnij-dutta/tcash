# AVAX Integration with eERC Converter

This guide explains how to use native AVAX tokens with the eERC converter system.

## Overview

The eERC converter system is designed to work with ERC20 tokens, but we've created an AVAX wrapper to enable native AVAX support:

1. **AVAX Wrapper Contract**: Converts native AVAX to WAVAX (Wrapped AVAX) ERC20 tokens
2. **eERC Integration**: Uses WAVAX with the existing eERC converter system
3. **Seamless UX**: Users can deposit native AVAX and it gets automatically wrapped

## Deployment Steps

### 1. Deploy AVAX Wrapper Contract

```bash
# Navigate to the frontend directory
cd front

# Install dependencies (if not already done)
npm install

# Deploy the AVAX wrapper to Fuji testnet
npx hardhat run scripts/deploy-avax-wrapper.ts --network fuji
```

### 2. Update Contract Address

After deployment, update the contract address in `front/hooks/useAVAXWrapper.ts`:

```typescript
const AVAX_WRAPPER_ADDRESS = "0x[YOUR_DEPLOYED_ADDRESS]"
```

### 3. Get Testnet AVAX

Get testnet AVAX from the official faucet:
- Visit: https://core.app/tools/testnet-faucet/
- Enter your wallet address
- Request 2 AVAX (free for testing)

## How It Works

### Deposit Flow
1. User selects "AVAX" as the token
2. User enters amount (e.g., 0.5 AVAX)
3. System automatically wraps native AVAX to WAVAX
4. WAVAX is deposited into the eERC converter
5. User receives encrypted eAVAX tokens

### Withdraw Flow
1. User withdraws encrypted eAVAX tokens
2. System receives WAVAX tokens
3. User can unwrap WAVAX back to native AVAX

## Features

- **Native AVAX Support**: Use your actual AVAX testnet tokens
- **Automatic Wrapping**: Seamlessly converts AVAX to WAVAX
- **Real Balances**: Shows your actual AVAX balance from the blockchain
- **Privacy Preserved**: All transactions are encrypted using eERC

## Token Options

The deposit page now supports:
- **AVAX**: Native Avalanche tokens (automatically wrapped)
- **WAVAX**: Wrapped AVAX tokens (direct deposit)
- **TEST**: Test ERC20 tokens (existing functionality)

## Testing

1. Get testnet AVAX from the faucet
2. Go to the deposit page
3. Select "AVAX" as the token
4. Enter an amount (0.1, 0.5, or 1 AVAX)
5. Click "Confirm Deposit"
6. Watch your AVAX get wrapped and deposited into eERC!

## Security Notes

- This is for testnet only - no real value
- The AVAX wrapper contract is simple and secure
- All transactions are on the Avalanche Fuji testnet
- Private keys are stored locally for testing

## Next Steps

- Deploy the AVAX wrapper contract
- Update the contract address
- Test with real testnet AVAX tokens
- Enjoy private AVAX transactions! 🚀
