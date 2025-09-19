# T-Cash Self KYC Testing - Quick Start

## 🚀 Quick Test Setup

### 1. **Connect Your Wallet**
- Open: http://localhost:3002
- Click "Connect Wallet" in the top right
- Approve MetaMask connection
- Switch to Celo Alfajores when prompted

### 2. **Check Current Integration Status**

The Self KYC system is already integrated! Here's what's working:

#### ✅ **Already Deployed & Working:**
- **SelfKYCVerifier**: `0x31fE360492189a0c03BACaE36ef9be682Ad3727B`
- **Self Hub V2**: `0x68c931C9a534D37aa78094877F46fE46a49F1A51`
- **QR Code Integration**: Complete ✅
- **Wallet Connection**: Fixed ✅

#### 🔄 **Ready to Deploy:**
- **Enhanced ComplianceOracle**: Will read from SelfKYCVerifier
- **ShieldedVault**: Will use enhanced compliance rules

### 3. **Test Current Functionality**

#### **Test Wallet Connection:**
```bash
# Should work now with MetaMask
1. Open http://localhost:3002
2. Click "Connect Wallet"
3. Approve MetaMask
4. Verify address shows in navbar
```

#### **Test Existing SelfKYCVerifier:**
```bash
# Check if the existing contract works
YOUR_ADDRESS="0x..." # Your wallet address

cast call 0x31fE360492189a0c03BACaE36ef9be682Ad3727B \\
    "isKYCVerified(address)" $YOUR_ADDRESS \\
    --rpc-url https://alfajores-forno.celo-testnet.org
```

#### **Test KYC Page:**
```bash
# Navigate to KYC test page
http://localhost:3002/kyc-test
```

### 4. **Deploy Enhanced Contracts (Optional)**

If you want to deploy the enhanced compliance system:

```bash
cd /home/levi/Desktop/t-cash/tcash/contracts

# Set your private key
export PRIVATE_KEY="your_private_key_here"

# Deploy enhanced compliance contracts
forge script script/DeployIntegratedCompliance.s.sol \\
    --rpc-url https://alfajores-forno.celo-testnet.org \\
    --broadcast \\
    --private-key $PRIVATE_KEY
```

### 5. **Test Self.xyz Mobile Integration**

#### **Complete KYC Process:**
1. **Download Self.xyz app** from app store
2. **Complete identity verification** with government ID
3. **Generate QR code** for T-Cash integration  
4. **Scan QR in T-Cash frontend**
5. **Sign wallet transaction** to store KYC data

#### **Expected Result:**
```
✅ KYC data stored in SelfKYCVerifier contract
✅ Compliance limits calculated based on document type
✅ OFAC checks performed automatically
✅ Age-based multipliers applied
```

### 6. **Verify Integration Works**

After completing Self.xyz KYC:

```bash
# Check your KYC status
cast call 0x31fE360492189a0c03BACaE36ef9be682Ad3727B \\
    "isKYCVerified(address)" $YOUR_ADDRESS \\
    --rpc-url https://alfajores-forno.celo-testnet.org

# Get detailed KYC data
cast call 0x31fE360492189a0c03BACaE36ef9be682Ad3727B \\
    "getKYCData(address)" $YOUR_ADDRESS \\
    --rpc-url https://alfajores-forno.celo-testnet.org
```

---

## 🎯 **What You Can Test Right Now:**

1. ✅ **Wallet Connection** - Should work with MetaMask
2. ✅ **Self KYC Contract** - Already deployed and functional  
3. ✅ **QR Code Integration** - Ready for Self.xyz mobile app
4. 🔄 **Enhanced Compliance** - Deploy when needed
5. 📱 **Mobile KYC Flow** - Use Self.xyz app

## 🔥 **Key Testing Points:**

- **Wallet connects** without Coinbase-only limitation
- **Network switches** to Celo Alfajores automatically  
- **SelfKYCVerifier contract** responds to queries
- **QR code scanning** triggers wallet signatures
- **Compliance rules** enforce based on KYC data

The integration is **largely complete** - you mainly need to test the wallet connection and optionally deploy the enhanced compliance contracts for full functionality!
