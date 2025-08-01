const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

// Test helper functions
const helpers = {
  // Deploy all contracts for testing
  async deployAllContracts() {
    const [owner, guardian, relayer, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy mock tokens for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdt = await MockERC20.deploy("Tether USD", "USDT", 6);
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
    const wbtc = await MockERC20.deploy("Wrapped Bitcoin", "wBTC", 8);
    const weth = await MockERC20.deploy("Wrapped Ethereum", "wETH", 18);
    
    // Deploy Mock Price Feeds
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    const usdtPriceFeed = await MockPriceFeed.deploy();
    const usdcPriceFeed = await MockPriceFeed.deploy();
    const daiPriceFeed = await MockPriceFeed.deploy();
    const wbtcPriceFeed = await MockPriceFeed.deploy();
    const wethPriceFeed = await MockPriceFeed.deploy();
    
    // Set mock prices
    await usdtPriceFeed.setPrice(ethers.utils.parseEther("1"));
    await usdcPriceFeed.setPrice(ethers.utils.parseEther("1"));
    await daiPriceFeed.setPrice(ethers.utils.parseEther("1"));
    await wbtcPriceFeed.setPrice(ethers.utils.parseEther("50000"));
    await wethPriceFeed.setPrice(ethers.utils.parseEther("3000"));
    
    // Deploy Oracle
    const PlasmaOracle = await ethers.getContractFactory("PlasmaOracle");
    const oracle = await upgrades.deployProxy(PlasmaOracle, [guardian.address], {
      initializer: "initialize",
    });
    
    // Deploy Mock Paymaster
    const MockPaymaster = await ethers.getContractFactory("MockPaymaster");
    const paymaster = await MockPaymaster.deploy();
    
    // Deploy Mock Bridge
    const MockBridge = await ethers.getContractFactory("MockBridge");
    const bridge = await MockBridge.deploy();
    
    // Deploy Liquidity Pool
    const PlasmaLiquidityPool = await ethers.getContractFactory("PlasmaLiquidityPool");
    const liquidityPool = await upgrades.deployProxy(PlasmaLiquidityPool, [[usdt.address, usdc.address, dai.address, wbtc.address, weth.address]], {
      initializer: "initialize",
    });
    
    // Deploy StableSwap
    const PlasmaStableSwap = await ethers.getContractFactory("PlasmaStableSwap");
    const stableSwap = await upgrades.deployProxy(PlasmaStableSwap, [
      paymaster.address,
      oracle.address,
      guardian.address,
      relayer.address
    ], {
      initializer: "initialize",
    });
    
    // Deploy BridgeHandler
    const PlasmaBridgeHandler = await ethers.getContractFactory("PlasmaBridgeHandler");
    const bridgeHandler = await upgrades.deployProxy(PlasmaBridgeHandler, [
      bridge.address,
      paymaster.address,
      oracle.address,
      guardian.address
    ], {
      initializer: "initialize",
    });
    
    return {
      contracts: {
        oracle,
        paymaster,
        bridge,
        liquidityPool,
        stableSwap,
        bridgeHandler,
        usdt,
        usdc,
        dai,
        wbtc,
        weth,
        usdtPriceFeed,
        usdcPriceFeed,
        daiPriceFeed,
        wbtcPriceFeed,
        wethPriceFeed
      },
      accounts: {
        owner,
        guardian,
        relayer,
        user1,
        user2,
        user3
      }
    };
  },
  
  // Setup tokens in oracle
  async setupOracle(oracle, tokens) {
    // Set deployer as authorized updater
    const [owner] = await ethers.getSigners();
    // Owner is already authorized in constructor, but let's make sure
    
    await oracle.addToken(tokens.usdt.address, 2, 100, 300, true);
    await oracle.addToken(tokens.usdc.address, 2, 100, 300, true);
    await oracle.addToken(tokens.dai.address, 2, 150, 300, true);
    await oracle.addToken(tokens.wbtc.address, 3, 500, 600, false);
    await oracle.addToken(tokens.weth.address, 3, 500, 600, false);
    
    // Create additional price feeds to meet minimum requirements
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    
    // Add multiple price sources for each token (minimum 2 sources required)
    await oracle.addPriceSource(tokens.usdt.address, tokens.usdtPriceFeed.address);
    const usdtPriceFeed2 = await MockPriceFeed.deploy();
    await usdtPriceFeed2.setPrice(ethers.utils.parseEther("1"));
    await oracle.addPriceSource(tokens.usdt.address, usdtPriceFeed2.address);
    
    await oracle.addPriceSource(tokens.usdc.address, tokens.usdcPriceFeed.address);
    const usdcPriceFeed2 = await MockPriceFeed.deploy();
    await usdcPriceFeed2.setPrice(ethers.utils.parseEther("1"));
    await oracle.addPriceSource(tokens.usdc.address, usdcPriceFeed2.address);
    
    await oracle.addPriceSource(tokens.dai.address, tokens.daiPriceFeed.address);
    const daiPriceFeed2 = await MockPriceFeed.deploy();
    await daiPriceFeed2.setPrice(ethers.utils.parseEther("1"));
    await oracle.addPriceSource(tokens.dai.address, daiPriceFeed2.address);
    
    await oracle.addPriceSource(tokens.wbtc.address, tokens.wbtcPriceFeed.address);
    const wbtcPriceFeed2 = await MockPriceFeed.deploy();
    await wbtcPriceFeed2.setPrice(ethers.utils.parseEther("50000"));
    await oracle.addPriceSource(tokens.wbtc.address, wbtcPriceFeed2.address);
    const wbtcPriceFeed3 = await MockPriceFeed.deploy();
    await wbtcPriceFeed3.setPrice(ethers.utils.parseEther("50000"));
    await oracle.addPriceSource(tokens.wbtc.address, wbtcPriceFeed3.address);
    
    await oracle.addPriceSource(tokens.weth.address, tokens.wethPriceFeed.address);
    const wethPriceFeed2 = await MockPriceFeed.deploy();
    await wethPriceFeed2.setPrice(ethers.utils.parseEther("3000"));
    await oracle.addPriceSource(tokens.weth.address, wethPriceFeed2.address);
    const wethPriceFeed3 = await MockPriceFeed.deploy();
    await wethPriceFeed3.setPrice(ethers.utils.parseEther("3000"));
    await oracle.addPriceSource(tokens.weth.address, wethPriceFeed3.address);
    
    // Store additional price feeds for test use
    tokens.usdtPriceFeed2 = usdtPriceFeed2;
    tokens.usdcPriceFeed2 = usdcPriceFeed2;
    tokens.daiPriceFeed2 = daiPriceFeed2;
    tokens.wbtcPriceFeed2 = wbtcPriceFeed2;
    tokens.wbtcPriceFeed3 = wbtcPriceFeed3;
    tokens.wethPriceFeed2 = wethPriceFeed2;
    tokens.wethPriceFeed3 = wethPriceFeed3;
    
    // Update initial prices to make tokens active
    await oracle.updatePrice(tokens.usdt.address);
    await oracle.updatePrice(tokens.usdc.address);
    await oracle.updatePrice(tokens.dai.address);
    await oracle.updatePrice(tokens.wbtc.address);
    await oracle.updatePrice(tokens.weth.address);
  },
  
  // Setup tokens in stable swap
  async setupStableSwap(stableSwap, tokens) {
    await stableSwap.addSupportedToken(tokens.usdt.address, true);
    await stableSwap.addSupportedToken(tokens.usdc.address, true);
    await stableSwap.addSupportedToken(tokens.dai.address, true);
    await stableSwap.addSupportedToken(tokens.wbtc.address, false);
    await stableSwap.addSupportedToken(tokens.weth.address, false);
    await stableSwap.setUSDTAddress(tokens.usdt.address);
  },
  
  // Setup liquidity in stable swap contract
  async setupStableSwapLiquidity(stableSwap, tokens, accounts) {
    // Seed initial liquidity for each token
    const liquidityAmounts = {
      usdt: ethers.utils.parseUnits("10000", 6),
      usdc: ethers.utils.parseUnits("10000", 6),
      dai: ethers.utils.parseEther("10000"),
      wbtc: ethers.utils.parseUnits("1", 8),
      weth: ethers.utils.parseEther("10")
    };
    
    // First approve tokens for stable swap
    for (const [tokenName, amount] of Object.entries(liquidityAmounts)) {
      await tokens[tokenName].connect(accounts.owner).approve(stableSwap.address, amount);
      await stableSwap.seedLiquidity(tokens[tokenName].address, amount);
    }
  },
  
  // Complete setup function that sets up everything for testing
  async completeSetup() {
    const { contracts, accounts } = await this.deployAllContracts();
    
    // Setup oracle with tokens and prices
    await this.setupOracle(contracts.oracle, contracts);
    
    // Setup stable swap with tokens
    await this.setupStableSwap(contracts.stableSwap, contracts);
    
    // Setup bridge handler
    await this.setupBridgeHandler(contracts.bridgeHandler, contracts);
    
    // Mint tokens to accounts
    await this.mintTokens(contracts, accounts);
    
    // Setup liquidity in stable swap
    await this.setupStableSwapLiquidity(contracts.stableSwap, contracts, accounts);
    
    // Approve tokens for users
    await this.approveTokens(contracts, accounts.user1, contracts.stableSwap.address);
    await this.approveTokens(contracts, accounts.user1, contracts.bridgeHandler.address);
    await this.approveTokens(contracts, accounts.user2, contracts.stableSwap.address);
    await this.approveTokens(contracts, accounts.user2, contracts.bridgeHandler.address);
    await this.approveTokens(contracts, accounts.user3, contracts.stableSwap.address);
    await this.approveTokens(contracts, accounts.user3, contracts.bridgeHandler.address);
    
    return { contracts, accounts };
  },
  
  // Setup tokens in bridge handler
  async setupBridgeHandler(bridgeHandler, tokens) {
    await bridgeHandler.setSupportedToken(tokens.usdt.address, true);
    await bridgeHandler.setSupportedToken(tokens.usdc.address, true);
    await bridgeHandler.setSupportedToken(tokens.dai.address, true);
    await bridgeHandler.setSupportedToken(tokens.wbtc.address, true);
    await bridgeHandler.setSupportedToken(tokens.weth.address, true);
    
    // Add supported chains
    await bridgeHandler.setSupportedChain(1, true); // Ethereum
    await bridgeHandler.setSupportedChain(56, true); // BSC
    await bridgeHandler.setSupportedChain(137, true); // Polygon
    
    // Set token limits to enable bridging
    await bridgeHandler.setTokenLimits(tokens.usdt.address, ethers.utils.parseUnits("1", 6), ethers.utils.parseUnits("100000", 6));
    await bridgeHandler.setTokenLimits(tokens.usdc.address, ethers.utils.parseUnits("1", 6), ethers.utils.parseUnits("100000", 6));
    await bridgeHandler.setTokenLimits(tokens.dai.address, ethers.utils.parseEther("1"), ethers.utils.parseEther("100000"));
    await bridgeHandler.setTokenLimits(tokens.wbtc.address, ethers.utils.parseUnits("0.0001", 8), ethers.utils.parseUnits("10", 8));
    await bridgeHandler.setTokenLimits(tokens.weth.address, ethers.utils.parseUnits("0.001", 18), ethers.utils.parseEther("1000"));
  },
  
  // Mint tokens to users
  async mintTokens(tokens, accounts) {
    const mintAmount = ethers.utils.parseEther("100000"); // Increased mint amount
    
    // Only mint for token contracts, not price feeds or other contracts
    const tokenContracts = ['usdt', 'usdc', 'dai', 'wbtc', 'weth'];
    
    for (const tokenName of tokenContracts) {
      const token = tokens[tokenName];
      if (!token) continue;
      
      if (tokenName === 'usdt' || tokenName === 'usdc') {
        // 6 decimals tokens - increased amount
        const amount = ethers.utils.parseUnits("100000", 6);
        await token.mint(accounts.owner.address, amount);
        await token.mint(accounts.user1.address, amount);
        await token.mint(accounts.user2.address, amount);
        await token.mint(accounts.user3.address, amount);
      } else if (tokenName === 'wbtc') {
        // 8 decimals token - increased amount
        const amount = ethers.utils.parseUnits("100", 8);
        await token.mint(accounts.owner.address, amount);
        await token.mint(accounts.user1.address, amount);
        await token.mint(accounts.user2.address, amount);
        await token.mint(accounts.user3.address, amount);
      } else {
        // 18 decimals tokens
        await token.mint(accounts.owner.address, mintAmount);
        await token.mint(accounts.user1.address, mintAmount);
        await token.mint(accounts.user2.address, mintAmount);
        await token.mint(accounts.user3.address, mintAmount);
      }
    }
  },
  
  // Time travel helper
  async timeTravel(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  },
  
  // Get current timestamp
  async getCurrentTime() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  },
  
  // Approve tokens for spending by a contract
  async approveTokens(tokens, fromAccount, spenderAddress, amount) {
    const tokenContracts = ['usdt', 'usdc', 'dai', 'wbtc', 'weth'];
    
    for (const tokenName of tokenContracts) {
      const token = tokens[tokenName];
      if (!token) continue;
      
      // Use max approval if no amount specified
      const approvalAmount = amount || ethers.constants.MaxUint256;
      await token.connect(fromAccount).approve(spenderAddress, approvalAmount);
    }
  },
  
  // Check token balances for debugging
  async checkTokenBalances(tokens, account) {
    const tokenContracts = ['usdt', 'usdc', 'dai', 'wbtc', 'weth'];
    const balances = {};
    
    for (const tokenName of tokenContracts) {
      const token = tokens[tokenName];
      if (!token) continue;
      
      const balance = await token.balanceOf(account.address);
      balances[tokenName] = balance;
    }
    
    return balances;
  },
  
  // Log token balances for debugging
  async logTokenBalances(tokens, account, label = 'Account') {
    const balances = await this.checkTokenBalances(tokens, account);
    console.log(`${label} (${account.address}) token balances:`);
    for (const [tokenName, balance] of Object.entries(balances)) {
      console.log(`  ${tokenName.toUpperCase()}: ${ethers.utils.formatUnits(balance, tokenName === 'usdt' || tokenName === 'usdc' ? 6 : tokenName === 'wbtc' ? 8 : 18)}`);
    }
  },
  
  // Prepare account for liquidity operations (mint + approve)
  async prepareAccountForLiquidity(tokens, account, liquidityPoolAddress, stableSwapAddress) {
    // Mint tokens to the account
    const tokenContracts = ['usdt', 'usdc', 'dai', 'wbtc', 'weth'];
    
    for (const tokenName of tokenContracts) {
      const token = tokens[tokenName];
      if (!token) continue;
      
      if (tokenName === 'usdt' || tokenName === 'usdc') {
        // 6 decimals tokens
        const amount = ethers.utils.parseUnits("100000", 6);
        await token.mint(account.address, amount);
      } else if (tokenName === 'wbtc') {
        // 8 decimals token
        const amount = ethers.utils.parseUnits("100", 8);
        await token.mint(account.address, amount);
      } else {
        // 18 decimals tokens
        const amount = ethers.utils.parseEther("100000");
        await token.mint(account.address, amount);
      }
      
      // Approve both liquidity pool and stable swap
      await token.connect(account).approve(liquidityPoolAddress, ethers.constants.MaxUint256);
      if (stableSwapAddress) {
        await token.connect(account).approve(stableSwapAddress, ethers.constants.MaxUint256);
      }
    }
  }
};

module.exports = {
  ...helpers,
  setupStableSwapLiquidity: helpers.setupStableSwapLiquidity,
  completeSetup: helpers.completeSetup
};
