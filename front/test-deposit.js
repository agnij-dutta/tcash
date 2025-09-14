// Simple test to verify deposit functionality
const { ethers } = require("hardhat");

async function testDeposit() {
  console.log("🧪 Testing eERC Deposit...");
  
  try {
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Testing with account:", deployer.address);
    
    // Contract addresses
    const encryptedERCAddress = "0x271B03d3A18b2270764669EDa1696f0b43634764";
    const testERC20Address = "0x7dF4f65Df627E53d1fb12CF5c4895E1ceB861c71";
    const registrarAddress = "0x698CDfd5d082D6c796cFCe24f78aF77400BD149d";
    
    // Connect to contracts
    const testERC20 = await ethers.getContractAt("SimpleERC20", testERC20Address, deployer);
    const encryptedERC = await ethers.getContractAt("EncryptedERC", encryptedERCAddress, deployer);
    const registrar = await ethers.getContractAt("Registrar", registrarAddress, deployer);
    
    // Check if user is registered
    const isRegistered = await registrar.isUserRegistered(deployer.address);
    console.log("User registered:", isRegistered);
    
    if (!isRegistered) {
      console.log("❌ User not registered. Need to register first.");
      return;
    }
    
    // Check token balance
    const tokenBalance = await testERC20.balanceOf(deployer.address);
    const tokenDecimals = await testERC20.decimals();
    const tokenSymbol = await testERC20.symbol();
    
    console.log(`💰 ${tokenSymbol} balance:`, ethers.formatUnits(tokenBalance, tokenDecimals));
    
    if (tokenBalance < ethers.parseUnits("1", tokenDecimals)) {
      console.log("❌ Insufficient balance. Need more tokens.");
      return;
    }
    
    // Check allowance
    const allowance = await testERC20.allowance(deployer.address, encryptedERCAddress);
    console.log(`📋 Allowance:`, ethers.formatUnits(allowance, tokenDecimals));
    
    const depositAmount = ethers.parseUnits("1", tokenDecimals);
    
    if (allowance < depositAmount) {
      console.log("🔓 Approving tokens...");
      const approveTx = await testERC20.approve(encryptedERCAddress, depositAmount);
      await approveTx.wait();
      console.log("✅ Approved");
    }
    
    // Simple amountPCT (placeholder)
    const amountPCT = [
      depositAmount,
      0n, 0n, 0n, 0n, 0n, 0n
    ];
    
    // Try deposit
    console.log("💾 Attempting deposit...");
    const depositTx = await encryptedERC.deposit(
      depositAmount,
      testERC20Address,
      amountPCT
    );
    
    console.log("📝 Deposit tx:", depositTx.hash);
    const receipt = await depositTx.wait();
    console.log("✅ Deposit successful! Block:", receipt.blockNumber);
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Full error:", error);
  }
}

testDeposit();
