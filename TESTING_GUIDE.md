# T-Cash Self KYC Integration Testing Guide

## 🎯 **Testing Overview**

This guide covers how to test the complete Self.xyz KYC integration with T-Cash smart contracts.

## 📋 **Prerequisites**

### **1. Environment Setup**
```bash
# Install dependencies
cd /home/levi/Desktop/t-cash/tcash/contracts
npm install

# Make sure you have foundry installed
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### **2. Required Accounts & Tokens**
- **MetaMask wallet** connected to Celo Alfajores testnet
- **CELO tokens** from faucet: https://faucet.celo.org/alfajores
- **Private key** for deployment (export from MetaMask)

### **3. Network Configuration**
```bash
# Add Celo Alfajores to MetaMask:
Network Name: Celo Alfajores Testnet
RPC URL: https://alfajores-forno.celo-testnet.org
Chain ID: 44787
Currency Symbol: CELO
Block Explorer: https://alfajores.celoscan.io/
```

## 🚀 **Step 1: Deploy Enhanced Compliance Contracts**

### **Create Environment File**
```bash
cd /home/levi/Desktop/t-cash/tcash/contracts
cat > .env << EOF
PRIVATE_KEY=your_private_key_here
CELO_ALFAJORES_RPC=https://alfajores-forno.celo-testnet.org
ETHERSCAN_API_KEY=optional_for_verification
EOF
```

### **Deploy Contracts**
```bash
# Deploy the integrated compliance system
forge script script/DeployIntegratedCompliance.s.sol \\
    --rpc-url https://alfajores-forno.celo-testnet.org \\
    --broadcast \\
    --verify \\
    --private-key $PRIVATE_KEY

# Check deployment status
cat deployments/self-integration.json
```

## 🧪 **Step 2: Test Contract Integration**

### **Test 1: Verify SelfKYCVerifier Connection**
```bash
# Check if ComplianceOracle is connected to SelfKYCVerifier
COMPLIANCE_ORACLE=$(cat deployments/self-integration.json | jq -r '.complianceOracle')
SELF_KYC_VERIFIER="0x31fE360492189a0c03BACaE36ef9be682Ad3727B"

cast call $COMPLIANCE_ORACLE \\
    "selfKYCVerifier()" \\
    --rpc-url https://alfajores-forno.celo-testnet.org

# Should return: 0x31fE360492189a0c03BACaE36ef9be682Ad3727B
```

### **Test 2: Check KYC Configuration**
```bash
# Check KYC settings
cast call $COMPLIANCE_ORACLE \\
    "kycValidityPeriod()" \\
    --rpc-url https://alfajores-forno.celo-testnet.org

cast call $COMPLIANCE_ORACLE \\
    "requireKYCForAll()" \\
    --rpc-url https://alfajores-forno.celo-testnet.org
```

### **Test 3: Check Document Type Limits**
```bash
# Check limits for different document types
for doc_type in 1 2 3; do
    echo "Document Type $doc_type limit:"
    cast call $COMPLIANCE_ORACLE \\
        "documentTypeMaxAmount(uint8)" $doc_type \\
        --rpc-url https://alfajores-forno.celo-testnet.org
done
```

### **Test 4: Test User KYC Status** 
```bash
# Check KYC status for your wallet address
YOUR_ADDRESS="your_wallet_address_here"

echo "Checking KYC status for: $YOUR_ADDRESS"

# Check if user is KYC verified
cast call $SELF_KYC_VERIFIER \\
    "isKYCVerified(address)" $YOUR_ADDRESS \\
    --rpc-url https://alfajores-forno.celo-testnet.org

# Get detailed KYC data
cast call $SELF_KYC_VERIFIER \\
    "getKYCData(address)" $YOUR_ADDRESS \\
    --rpc-url https://alfajores-forno.celo-testnet.org

# Check compliance status
cast call $COMPLIANCE_ORACLE \\
    "isUserKYCCompliant(address)" $YOUR_ADDRESS \\
    --rpc-url https://alfajores-forno.celo-testnet.org

# Get user's max allowed amount
cast call $COMPLIANCE_ORACLE \\
    "getUserMaxAmount(address)" $YOUR_ADDRESS \\
    --rpc-url https://alfajores-forno.celo-testnet.org
```

## 🖥️ **Step 3: Test Frontend Integration**

### **Start Frontend**
```bash
cd /home/levi/Desktop/t-cash/tcash/front
npm run dev
```

### **Test Wallet Connection**
1. **Open browser**: http://localhost:3000
2. **Click "Connect Wallet"** in navbar
3. **Connect MetaMask** 
4. **Switch to Celo Alfajores** when prompted
5. **Verify connection** shows your address

### **Test KYC Status UI**
1. **Navigate to KYC Test page**: http://localhost:3000/kyc-test
2. **Check KYC status display**
3. **Verify compliance limits** are shown correctly

## 📱 **Step 4: Test Self.xyz Mobile Integration**

### **Complete KYC Process**
1. **Download Self.xyz app** from app store
2. **Complete identity verification** with your document
3. **Generate QR code** for T-Cash integration
4. **Scan QR code** in T-Cash frontend
5. **Verify transaction** on mobile app

### **Expected Flow**
```
Mobile App → Document Scan → ZK Proof Generation 
          → QR Code → T-Cash Frontend → Wallet Signature 
          → SelfKYCVerifier.customVerificationHook() 
          → KYC Data Stored On-Chain
```

## 🔍 **Step 5: End-to-End Testing**

### **Test Complete Withdrawal Flow**
```bash
# Test exit allowance for different amounts
SHIELDED_VAULT=$(cat deployments/self-integration.json | jq -r '.shieldedVault')
TOKEN_ADDRESS="0x0000000000000000000000000000000000000000" # Use appropriate token

# Test small amount (should pass for KYC users)
cast call $COMPLIANCE_ORACLE \\
    "isExitAllowed(address,uint256)" \\
    $TOKEN_ADDRESS 1000000000000000000000 \\
    --rpc-url https://alfajores-forno.celo-testnet.org

# Test large amount (might fail based on KYC tier)
cast call $COMPLIANCE_ORACLE \\
    "isExitAllowed(address,uint256)" \\
    $TOKEN_ADDRESS 100000000000000000000000 \\
    --rpc-url https://alfajores-forno.celo-testnet.org
```

### **Test Different User Scenarios**

#### **Scenario 1: Non-KYC User**
- Should be **denied** for any withdrawal
- Frontend should show "KYC Required" message

#### **Scenario 2: KYC User with E-Passport**
- Should be **allowed** up to $100,000
- Age multipliers apply

#### **Scenario 3: KYC User with EU ID Card** 
- Should be **allowed** up to $50,000
- Age multipliers apply

#### **Scenario 4: OFAC Restricted User**
- Should be **denied** all transactions
- Compliance oracle should catch restriction

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Contract Not Found**
```bash
# Check if contracts are deployed
cast code $COMPLIANCE_ORACLE --rpc-url https://alfajores-forno.celo-testnet.org
# Should return bytecode, not 0x
```

#### **KYC Not Working**
```bash
# Check SelfKYCVerifier is properly connected
cast call $COMPLIANCE_ORACLE "selfKYCVerifier()" --rpc-url https://alfajores-forno.celo-testnet.org
# Should return 0x31fE360492189a0c03BACaE36ef9be682Ad3727B
```

#### **Frontend Connection Issues**
- Check MetaMask is on **Celo Alfajores** (Chain ID: 44787)
- Verify contract addresses in frontend config
- Check console for JavaScript errors

## 📊 **Expected Test Results**

### **✅ Success Indicators**
- [ ] Contracts deploy successfully
- [ ] ComplianceOracle reads from SelfKYCVerifier
- [ ] Frontend connects to wallet
- [ ] KYC status displays correctly
- [ ] Compliance limits enforce properly
- [ ] Self.xyz QR integration works

### **📈 Performance Metrics**
- **Contract deployment**: ~2-3 minutes
- **KYC verification**: Real-time
- **Compliance check**: <1 second
- **QR code generation**: <5 seconds

## 🎯 **Next Steps After Testing**

1. **Deploy to Celo Mainnet** (when ready for production)
2. **Integrate additional tokens** (USDC, cUSD, etc.)
3. **Add more compliance rules** (country restrictions, etc.)
4. **Enhance UI/UX** based on testing feedback
5. **Add monitoring & analytics**

---

## 🆘 **Need Help?**

If you encounter issues:
1. Check the **deployment logs** in `deployments/`
2. Verify **network configuration** in MetaMask
3. Review **contract addresses** in frontend config
4. Test **individual components** before full integration
