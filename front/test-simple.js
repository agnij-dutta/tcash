// Simple test to check if we can connect to the contracts
const { ethers } = require("ethers");

async function testConnection() {
  console.log("🔌 Testing contract connection...");
  
  try {
    // Fuji testnet RPC
    const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
    
    // Contract addresses
    const testERC20Address = "0x7dF4f65Df627E53d1fb12CF5c4895E1ceB861c71";
    const encryptedERCAddress = "0x271B03d3A18b2270764669EDa1696f0b43634764";
    
    // Simple ERC20 ABI
    const erc20ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)"
    ];
    
    // Connect to contracts
    const testERC20 = new ethers.Contract(testERC20Address, erc20ABI, provider);
    
    // Test basic contract calls
    const symbol = await testERC20.symbol();
    const decimals = await testERC20.decimals();
    console.log("✅ Token symbol:", symbol);
    console.log("✅ Token decimals:", decimals);
    
    // Test with a random address
    const testAddress = "0x1234567890123456789012345678901234567890";
    const balance = await testERC20.balanceOf(testAddress);
    console.log("✅ Balance check works:", ethers.formatUnits(balance, decimals));
    
    console.log("🎉 Contract connection successful!");
    
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  }
}

testConnection();
