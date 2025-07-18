const { ethers, upgrades } = require("hardhat");
const { writeFileSync } = require("fs");

async function main() {
  console.log("🚀 Deploying Plasma Stablecoin Swap & Bridge to Testnet...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Configuration for Plasma testnet
  const config = {
    guardian: process.env.GUARDIAN_ADDRESS || deployer.address,
    relayer: process.env.RELAYER_ADDRESS || deployer.address,
    tokens: {
      usdt: process.env.USDT_ADDRESS || "0x0000000000000000000000000000000000000000",
      usdc: process.env.USDC_ADDRESS || "0x0000000000000000000000000000000000000000",
      dai: process.env.DAI_ADDRESS || "0x0000000000000000000000000000000000000000",
      wbtc: process.env.WBTC_ADDRESS || "0x0000000000000000000000000000000000000000",
      weth: process.env.WETH_ADDRESS || "0x0000000000000000000000000000000000000000"
    },
    bridges: {
      plasma: process.env.PLASMA_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000",
      bitcoin: process.env.BITCOIN_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000"
    },
    paymaster: process.env.PLASMA_PAYMASTER_ADDRESS || "0x0000000000000000000000000000000000000000"
  };

  console.log("📋 Deployment configuration:");
  console.log(JSON.stringify(config, null, 2));

  // Deploy contracts
  const deployedContracts = {};

  try {
    // 1. Deploy Price Oracle
    console.log("\n📊 Deploying PlasmaOracle...");
    const PlasmaOracle = await ethers.getContractFactory("PlasmaOracle");
    const oracle = await upgrades.deployProxy(PlasmaOracle, [config.guardian], {
      initializer: "initialize",
      kind: "uups"
    });
    await oracle.deployed();
    deployedContracts.oracle = oracle.address;
    console.log("✅ PlasmaOracle deployed to:", oracle.address);

    // 2. Deploy StableSwap
    console.log("\n💱 Deploying PlasmaStableSwap...");
    const PlasmaStableSwap = await ethers.getContractFactory("PlasmaStableSwap");
    const stableSwap = await upgrades.deployProxy(PlasmaStableSwap, [
      config.paymaster,
      oracle.address,
      config.guardian,
      config.relayer,
      ethers.constants.AddressZero // liquidityPool - to be set later
    ], {
      initializer: "initialize",
      kind: "uups"
    });
    await stableSwap.deployed();
    deployedContracts.stableSwap = stableSwap.address;
    console.log("✅ PlasmaStableSwap deployed to:", stableSwap.address);

    // 3. Deploy Bridge Handler
    console.log("\n🌉 Deploying PlasmaBridgeHandler...");
    const PlasmaBridgeHandler = await ethers.getContractFactory("PlasmaBridgeHandler");
    const bridgeHandler = await upgrades.deployProxy(PlasmaBridgeHandler, [
      config.bridges.plasma,
      config.paymaster,
      oracle.address,
      config.guardian
    ], {
      initializer: "initialize",
      kind: "uups"
    });
    await bridgeHandler.deployed();
    deployedContracts.bridgeHandler = bridgeHandler.address;
    console.log("✅ PlasmaBridgeHandler deployed to:", bridgeHandler.address);

    // 4. Configure Oracle with initial tokens
    console.log("\n⚙️  Configuring PlasmaOracle...");
    
    // Add stablecoin tokens
    if (config.tokens.usdt !== ethers.constants.AddressZero) {
      await oracle.addToken(config.tokens.usdt, 2, 100, 300, true); // USDT
      console.log("✅ Added USDT to oracle");
    }
    
    if (config.tokens.usdc !== ethers.constants.AddressZero) {
      await oracle.addToken(config.tokens.usdc, 2, 100, 300, true); // USDC
      console.log("✅ Added USDC to oracle");
    }
    
    if (config.tokens.dai !== ethers.constants.AddressZero) {
      await oracle.addToken(config.tokens.dai, 2, 150, 300, true); // DAI
      console.log("✅ Added DAI to oracle");
    }

    // Add non-stablecoin tokens
    if (config.tokens.wbtc !== ethers.constants.AddressZero) {
      await oracle.addToken(config.tokens.wbtc, 3, 500, 600, false); // wBTC
      console.log("✅ Added wBTC to oracle");
    }
    
    if (config.tokens.weth !== ethers.constants.AddressZero) {
      await oracle.addToken(config.tokens.weth, 3, 500, 600, false); // wETH
      console.log("✅ Added wETH to oracle");
    }

    // 5. Configure StableSwap with tokens
    console.log("\n💱 Configuring PlasmaStableSwap...");
    
    const tokens = Object.values(config.tokens).filter(addr => addr !== ethers.constants.AddressZero);
    for (const token of tokens) {
      if (token === config.tokens.usdt || token === config.tokens.usdc || token === config.tokens.dai) {
        await stableSwap.addSupportedToken(token, true); // stablecoin
        console.log(`✅ Added ${token} as stablecoin to swap`);
      } else {
        await stableSwap.addSupportedToken(token, false); // non-stablecoin
        console.log(`✅ Added ${token} as non-stablecoin to swap`);
      }
    }
    
    // Set USDT address in swap contract
    if (config.tokens.usdt !== ethers.constants.AddressZero) {
      await stableSwap.setUSDTAddress(config.tokens.usdt);
      console.log("✅ Set USDT address in swap contract");
    }

    // 6. Configure Bridge Handler with tokens and chains
    console.log("\n🌉 Configuring PlasmaBridgeHandler...");
    
    // Add supported tokens
    for (const token of tokens) {
      await bridgeHandler.setSupportedToken(token, true);
      console.log(`✅ Added ${token} to bridge`);
    }

    // Add supported chains (example chain IDs)
    const supportedChains = [1, 56, 137, 42161, 10]; // Ethereum, BSC, Polygon, Arbitrum, Optimism
    for (const chainId of supportedChains) {
      await bridgeHandler.setSupportedChain(chainId, true);
      console.log(`✅ Added chain ${chainId} to bridge`);
    }

    // Set Bitcoin bridge if available
    if (config.bridges.bitcoin !== ethers.constants.AddressZero) {
      await bridgeHandler.setBitcoinBridge(config.bridges.bitcoin);
      console.log("✅ Set Bitcoin bridge address");
    }

    // 7. Set daily volume caps for testing
    console.log("\n📊 Setting volume caps...");
    const testVolumeCap = ethers.utils.parseEther("10000"); // 10k tokens per day for testing
    await stableSwap.setDailyVolumeCap(deployer.address, testVolumeCap);
    console.log("✅ Set daily volume cap for deployer");

    // 8. Generate deployment summary
    const deploymentSummary = {
      network: "plasma-testnet",
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: deployedContracts,
      configuration: config,
      supportedChains,
      gasUsed: {
        oracle: "~2,500,000",
        stableSwap: "~3,200,000",
        bridgeHandler: "~2,800,000",
        total: "~8,500,000"
      }
    };

    // Write deployment info to file
    writeFileSync(
      './deployment-summary.json',
      JSON.stringify(deploymentSummary, null, 2)
    );

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Contract Addresses:");
    console.log("PlasmaOracle:", deployedContracts.oracle);
    console.log("PlasmaStableSwap:", deployedContracts.stableSwap);
    console.log("PlasmaBridgeHandler:", deployedContracts.bridgeHandler);

    console.log("\n📄 Deployment summary saved to: deployment-summary.json");
    
    console.log("\n🔍 Verification commands:");
    console.log(`npx hardhat verify --network plasma-testnet ${deployedContracts.oracle}`);
    console.log(`npx hardhat verify --network plasma-testnet ${deployedContracts.stableSwap}`);
    console.log(`npx hardhat verify --network plasma-testnet ${deployedContracts.bridgeHandler}`);

    console.log("\n✅ Ready for frontend integration!");
    console.log("Update your .env file with the deployed contract addresses:");
    console.log(`PRICE_ORACLE_ADDRESS=${deployedContracts.oracle}`);
    console.log(`STABLE_SWAP_ADDRESS=${deployedContracts.stableSwap}`);
    console.log(`BRIDGE_HANDLER_ADDRESS=${deployedContracts.bridgeHandler}`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
