# Debugging Guide

## Common Issues & Solutions

### 🔗 Connection Issues
**Problem**: "Pool Not Found" error
**Solutions**:
- Check if USDC/WAVAX pools exist on Fuji V3
- Try different fee tiers (0.05%, 0.3%, 1%)
- Verify contract addresses in config

**Problem**: "Network Error" in quotes
**Solutions**:
- Ensure wallet is on Fuji testnet (Chain ID: 43113)
- Check RPC endpoint is working
- Verify contract deployment addresses

### 💱 Quote Issues
**Problem**: Quotes not loading
**Debug Steps**:
1. Open browser DevTools (F12)
2. Check Console for errors
3. Look for failed contract calls
4. Verify V3 Quoter address: `0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6`

**Problem**: Quote is 0 or very small
**Solutions**:
- Pool may have no liquidity
- Try smaller amounts
- Check token decimals (USDC=6, WAVAX=18)

### 🔒 Privacy/EERC Issues
**Problem**: EERC registration fails
**Solutions**:
- Check AvaCloud EERC service status
- Verify converter address: `0x372dAB27c8d223Af11C858ea00037Dc03053B22E`
- Ensure you have AVAX for gas

**Problem**: ZK proof generation fails
**Solutions**:
- Check circuit URLs in network config
- Verify encrypted balance is sufficient
- Ensure nullifier hasn't been used

### 📊 Contract Issues
**Problem**: Swap transaction reverts
**Debug Steps**:
1. Check transaction on Snowtrace
2. Look for revert reason
3. Common causes:
   - Slippage too low
   - Pool doesn't exist
   - Insufficient balance
   - Invalid ZK proof

## Testing with Browser DevTools

### Console Commands for Testing:
```javascript
// Check V3 integration
console.log("V3 Router:", process.env.NEXT_PUBLIC_PRIVACY_V3_ROUTER);

// Test pool existence
const router = new ethers.Contract(routerAddress, routerABI, provider);
const poolExists = await router.poolExists(usdcAddress, wavaxAddress, 3000);
console.log("Pool exists:", poolExists);

// Test quote
const quote = await router.getSwapQuote(usdcAddress, wavaxAddress, "1000000", 3000);
console.log("Quote:", quote.toString());
```

### Network Tab (F12 → Network):
- Monitor RPC calls to Fuji
- Check for failed requests
- Verify circuit URL accessibility

### Application Tab:
- Check localStorage for user settings
- Verify wallet connection state
- Look for cached data issues