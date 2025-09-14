# Frontend Testing Checklist

## 🔌 Connection & Setup
- [ ] Connect wallet to Fuji testnet (43113)
- [ ] Wallet shows correct AVAX balance
- [ ] Get Fuji AVAX from faucet if needed: https://faucets.chain.link/fuji
- [ ] Register with EERC system
- [ ] Check encrypted balance displays

## 💱 Swap Interface
- [ ] Token selector shows eUSDC and eWAVAX
- [ ] Amount input accepts values
- [ ] V3 quote loads automatically (green "Live Uniswap V3 Price" indicator)
- [ ] Pool existence check works (should show pool status)
- [ ] Fee tier selector (0.05%, 0.3%, 1%) changes quotes
- [ ] Slippage settings work (0.1%, 0.5%, 1%, 2%)

## 📊 V3 Integration Features
- [ ] **Quote Display**: Real-time quotes from V3 (updates every 10s)
- [ ] **Pool Status**: Green dot for available pools, yellow for unavailable
- [ ] **Price Impact**: Shows color-coded impact (green < 1%, yellow < 5%, red > 5%)
- [ ] **Minimum Received**: Displays with slippage protection
- [ ] **Route Info**: Shows "Via Uniswap V3"
- [ ] **Fee Selection**: Different fees give different quotes

## ⚠️ Error Handling
- [ ] "Pool Not Found" when no liquidity
- [ ] "Insufficient Balance" for large amounts
- [ ] "Loading V3 Quote..." during price fetching
- [ ] Network errors display properly

## 🔒 Privacy Features
- [ ] Privacy message: "🔒 This swap is completely private using zero-knowledge proofs"
- [ ] ZK proof generation indicators
- [ ] Encrypted balance updates after swap
- [ ] No public transaction history visible

## Console Testing (F12 Developer Tools)
Check for errors in browser console:
- [ ] No TypeScript errors
- [ ] No contract call failures
- [ ] V3 quote calls successful
- [ ] Pool existence checks working