import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying AVAX Wrapper Contract...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy AVAXWrapper
  const AVAXWrapper = await ethers.getContractFactory("AVAXWrapper");
  const avaxWrapper = await AVAXWrapper.deploy();
  
  await avaxWrapper.deployed();
  
  console.log("✅ AVAXWrapper deployed to:", avaxWrapper.address);
  console.log("📋 Contract details:");
  console.log("  - Name: Wrapped AVAX (WAVAX)");
  console.log("  - Decimals: 18");
  console.log("  - Address:", avaxWrapper.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: "fuji",
    deployer: deployer.address,
    deploymentTimestamp: new Date().toISOString(),
    contracts: {
      avaxWrapper: avaxWrapper.address
    },
    metadata: {
      name: "Wrapped AVAX",
      symbol: "WAVAX",
      decimals: 18,
      description: "Wrapper contract for native AVAX to work with eERC converter"
    }
  };
  
  const fs = require('fs');
  const path = require('path');
  const deploymentPath = path.join(__dirname, '../deployments/avax-wrapper.json');
  
  // Ensure deployments directory exists
  const deploymentsDir = path.dirname(deploymentPath);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentPath);
  
  console.log("\n🎯 Next Steps:");
  console.log("1. Update your frontend to use this AVAX wrapper address");
  console.log("2. Users can wrap native AVAX into WAVAX tokens");
  console.log("3. Use WAVAX with the eERC converter system");
  console.log("4. Unwrap WAVAX back to native AVAX when needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
