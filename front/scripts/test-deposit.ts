import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing eERC Deposit Functionality...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Connect to the deployed contracts
  const encryptedERCAddress = "0x271B03d3A18b2270764669EDa1696f0b43634764";
  const testERC20Address = "0x7dF4f65Df627E53d1fb12CF5c4895E1ceB861c71";
  
  const testERC20 = await ethers.getContractAt("SimpleERC20", testERC20Address, deployer);
  const encryptedERC = await ethers.getContractAt("EncryptedERC", encryptedERCAddress, deployer);
  
  try {
    // Check if user is registered
    const registrarAddress = "0x698CDfd5d082D6c796cFCe24f78aF77400BD149d";
    const registrar = await ethers.getContractAt("Registrar", registrarAddress, deployer);
    
    const isRegistered = await registrar.isUserRegistered(deployer.address);
    if (!isRegistered) {
      console.log("❌ User is not registered. Please register first.");
      return;
    }
    console.log("✅ User is registered");
    
    // Check token balance
    const tokenBalance = await testERC20.balanceOf(deployer.address);
    const tokenDecimals = await testERC20.decimals();
    const tokenSymbol = await testERC20.symbol();
    
    console.log(`💰 Current ${tokenSymbol} balance:`, ethers.formatUnits(tokenBalance, tokenDecimals), tokenSymbol);
    
    if (tokenBalance < ethers.parseUnits("1", tokenDecimals)) {
      console.log("❌ Insufficient balance. Please get more tokens from faucet.");
      return;
    }
    
    // Check allowance
    const currentAllowance = await testERC20.allowance(deployer.address, encryptedERCAddress);
    console.log(`📋 Current allowance:`, ethers.formatUnits(currentAllowance, tokenDecimals), tokenSymbol);
    
    const depositAmount = ethers.parseUnits("1", tokenDecimals);
    
    if (currentAllowance < depositAmount) {
      console.log(`🔓 Approving ${tokenSymbol} spending for EncryptedERC...`);
      const approveTx = await testERC20.approve(encryptedERCAddress, depositAmount);
      console.log("📝 Approval transaction sent:", approveTx.hash);
      await approveTx.wait();
      console.log("✅ Approval confirmed");
    } else {
      console.log("✅ Allowance already sufficient");
    }
    
    // Generate amountPCT for auditing (simplified)
    const amountPCT = [
      depositAmount,
      0n, 0n, 0n, 0n, 0n, 0n
    ];
    
    // Perform the deposit
    console.log(`💾 Depositing 1 ${tokenSymbol} into EncryptedERC...`);
    const depositTx = await encryptedERC.deposit(
      depositAmount,
      testERC20Address,
      amountPCT
    );
    console.log("📝 Deposit transaction sent:", depositTx.hash);
    
    const receipt = await depositTx.wait();
    console.log("✅ Deposit transaction confirmed in block:", receipt?.blockNumber);
    
    // Check results
    const newTokenBalance = await testERC20.balanceOf(deployer.address);
    const deposited = tokenBalance - newTokenBalance;
    
    console.log("🎉 Deposit successful!");
    console.log(`💰 Previous ${tokenSymbol} balance:`, ethers.formatUnits(tokenBalance, tokenDecimals), tokenSymbol);
    console.log(`💰 New ${tokenSymbol} balance:`, ethers.formatUnits(newTokenBalance, tokenDecimals), tokenSymbol);
    console.log(`📦 Amount deposited:`, ethers.formatUnits(deposited, tokenDecimals), tokenSymbol);
    
  } catch (error) {
    console.error("❌ Error during deposit test:");
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
