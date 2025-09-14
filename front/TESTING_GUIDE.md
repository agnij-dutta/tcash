# eERC Registration Testing Guide

This guide provides step-by-step instructions for testing the eERC registration flow integration.

## Prerequisites

1. **Avalanche Fuji Testnet Wallet Setup**
   - Install MetaMask or another Avalanche-compatible wallet
   - Add Avalanche Fuji Testnet:
     - **Network Name**: Avalanche Fuji Testnet
     - **Chain ID**: 43113
     - **RPC URL**: https://api.avax-test.network/ext/bc/C/rpc
     - **Currency Symbol**: AVAX
     - **Block Explorer**: https://testnet.snowscan.xyz
   - Get testnet AVAX from the [Avalanche Faucet](https://faucet.avax.network/) (registration requires gas fees)

   **Quick MetaMask Setup for Fuji:**
   1. Open MetaMask and click the network dropdown
   2. Select "Add Network" → "Add a network manually"
   3. Enter the exact details above (make sure Chain ID is **43113**)
   4. Click "Save" and switch to the new network
   5. Verify the network name shows as "Avalanche Fuji Testnet"

2. **Development Environment**
   ```bash
   cd /path/to/tcash/front
   npm install
   npm run dev
   ```

3. **Contract Verification**
   - Verify deployed contracts are accessible:
   - eERC Contract: `0xf8a046309a39A9E7C31BeA40256225332376b836`
   - Registrar Contract: `0x420058F5FB767773150d1a6987bCf10f4EA088aC`
   - Registration Verifier: `0x6F212fEc35A4872a9475bd92CA370a6ea004A1AE`

## Testing Steps

### Phase 1: Initial Setup Testing

1. **Navigate to Onboarding**
   - Open `http://localhost:3000/onboarding`
   - Verify the UI loads correctly
   - Check that all components render properly

2. **Enable Debug Panel**
   - Click the "Debug" button in the top-right corner
   - Verify the debug panel shows:
     - Connected: ❌ (should be false initially)
     - SDK Initialized: ❌ (should be false initially)
     - Registration Status: `not_started`

3. **Connect Wallet**
   - Click the "Connect Wallet" button in the top-right header
   - Choose your preferred wallet (MetaMask, Injected, etc.)
   - Ensure you're on the Fuji testnet (Chain ID: 43113)
   - If on wrong network, the wallet button will show "Wrong Network" in red
   - Verify debug panel updates:
     - Connected: ✅ (with shortened address)
     - SDK Initialized should change to ✅ after a moment
   - Check console logs for eERC Hook State updates

### Phase 2: Registration Flow Testing

4. **Navigate to Registration Step (Step 3)**
   - Click through onboarding steps 0, 1, 2 to reach the eERC Registration step
   - Or manually set step by modifying the URL or using browser dev tools

5. **Generate Decryption Key**
   - Verify the "Generate Decryption Key" button is enabled
   - Click the button and monitor:
     - Debug panel logs should show key generation process
     - Registration Status should change to `key_generated`
     - Button should change to show "Register with eERC"
   - **Expected Logs:**
     ```
     INFO: Starting decryption key generation
     INFO: Decryption key generated successfully
     ```

6. **Register with eERC Protocol**
   - Click "Register with eERC" button
   - Monitor the registration process:
     - MetaMask should prompt for transaction signature
     - Debug panel should show transaction hash when submitted
     - Registration Status should change to `registered`
   - **Expected Logs:**
     ```
     INFO: Starting eERC protocol registration
     INFO: Registration successful
     ```

7. **Verify Registration Completion**
   - UI should show "Registration Complete!" message
   - Green checkmark should appear
   - After 1.5 seconds, should auto-advance to next step

### Phase 3: Wallet Connection Testing

8. **Test Wallet Connection Features**
   - Click the connected wallet button dropdown
   - Verify you can:
     - Copy wallet address to clipboard
     - View wallet on block explorer (opens testnet.snowtrace.io)
     - See current network information
     - Disconnect the wallet
   - Test network detection (switch to wrong network and back)

### Phase 4: Error Handling Testing

9. **Test Wallet Disconnection**
   - Disconnect wallet during registration
   - Verify appropriate error messages appear
   - Check that registration step shows wallet connect button
   - Check that buttons become disabled

10. **Test Already Registered User**
    - Complete registration once
    - Use "Reset Data" button in debug panel
    - Try registering again with the same wallet
    - Should detect existing registration and handle gracefully

11. **Test Network Issues**
    - Try with wrong network (switch to Ethereum mainnet)
    - Verify proper error handling and network detection
    - Wallet button should show "Wrong Network" in red
    - Verify switching back to Fuji testnet works correctly

### Phase 5: Data Persistence Testing

12. **Test Local Storage Persistence**
    - Complete registration
    - Refresh the page
    - Navigate back to registration step
    - Verify that registration status is remembered

13. **Test Clear Data Functionality**
    - Use "Reset Data" button in debug panel
    - Verify all stored data is cleared
    - Registration status should reset to `not_started`

### Phase 6: On-Chain Verification

14. **Verify Registration on Blockchain**
    - Copy transaction hash from debug panel
    - Check transaction on Fuji Snowtrace: `https://testnet.snowtrace.io/tx/[hash]`
    - Verify transaction succeeded and gas was consumed

15. **Check Registrar Contract**
    - Use "Check Status" button in debug panel
    - This calls `isUserRegistered()` on the Registrar contract
    - Should return true for registered addresses
    - Verify the call is made to the correct Fuji testnet contract

## Expected Debug Logs

### Successful Registration Flow:
```
INFO: eERC Hook State Updated
INFO: Loading persistent data for address
INFO: Secure seed phrase generated
INFO: Starting decryption key generation
INFO: Decryption key generated successfully
INFO: Starting eERC protocol registration
INFO: Registration successful
INFO: Registration status checked
```

### Error Scenarios:
```
ERROR: Cannot generate key: wallet not connected
ERROR: Key generation failed: [specific error message]
ERROR: Registration failed: [specific error message]
WARN: Could not check registration status
```

## Troubleshooting Common Issues

### 1. "eERC SDK is not initialized"
- **Cause:** SDK hasn't finished loading or wallet not connected
- **Solution:** Wait a few seconds, ensure wallet is connected to Avalanche network

### 2. "Registration failed: Invalid proof"
- **Cause:** ZK proof generation failed or circuit files not accessible
- **Solution:** Check that circuit files are available in `/public/circuits/`

### 3. "Transaction failed"
- **Cause:** Insufficient gas, network issues, or already registered
- **Solution:** Check AVAX balance, verify network connection, use debug panel to check registration status

### 4. Debug panel shows "SDK Initialized: ❌"
- **Cause:** Network mismatch, contract addresses incorrect, or RPC issues
- **Solution:** Verify you're on Avalanche Fuji Testnet (Chain ID: 43113), check contract addresses in config

### 5. "Insufficient funds" error during registration
- **Cause:** Not enough testnet AVAX for gas fees
- **Solution:** Get more testnet AVAX from the [Avalanche Faucet](https://faucet.avax.network/)

### 6. Wallet shows "Wrong Network"
- **Cause:** Connected to wrong blockchain network or Chain ID mismatch
- **Solution:**
  1. Check browser console for "Network Debug" logs to see detected chain ID
  2. Verify MetaMask shows Chain ID: 43113
  3. Ensure network name is exactly "Avalanche Fuji Testnet"
  4. Try disconnecting and reconnecting wallet
  5. If still failing, delete and re-add the Fuji network with exact details above

## Performance Monitoring

Monitor these metrics during testing:
- Key generation time (should be < 5 seconds)
- Registration transaction time (depends on network congestion)
- UI responsiveness during async operations
- Memory usage (check for leaks in long sessions)

## Security Notes

- Never log actual private keys or decryption keys in production
- Verify all user inputs are properly validated
- Check that sensitive data is encrypted when stored locally
- Ensure transaction signatures are properly verified

## Advanced Testing

For more thorough testing:
1. Test with multiple browser profiles/wallets
2. Test rapid successive registrations
3. Test with different transaction gas prices
4. Test registration during network congestion
5. Test with hardware wallets (Ledger, etc.)

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Screenshot of debug panel
3. Console logs
4. Wallet address and transaction hash (if applicable)
5. Browser and wallet extension versions