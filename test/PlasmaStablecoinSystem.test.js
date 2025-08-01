const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Plasma Stablecoin System - Simplified Oracle-Based", function () {
  let stableSwap, bridgeHandler, oracle, paymaster, plasmaBridge;
  let usdt, usdc, dai, wbtc, weth;
  let owner, guardian, relayer, user1, user2;
  let mockPriceFeed;

  before(async function () {
    [owner, guardian, relayer, user1, user2] = await ethers.getSigners();

    // Deploy mock tokens with correct decimals
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdt = await MockERC20.deploy("USD Tether", "USDT", 6);
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
    wbtc = await MockERC20.deploy("Wrapped Bitcoin", "wBTC", 8);
    weth = await MockERC20.deploy("Wrapped Ethereum", "wETH", 18);

    // Deploy mock infrastructure
    const MockPaymaster = await ethers.getContractFactory("MockPaymaster");
    paymaster = await MockPaymaster.deploy();

    const MockBridge = await ethers.getContractFactory("MockBridge");
    plasmaBridge = await MockBridge.deploy();

    // Deploy price oracle
    const PlasmaOracle = await ethers.getContractFactory("PlasmaOracle");
    oracle = await upgrades.deployProxy(PlasmaOracle, [guardian.address], {
      initializer: "initialize",
    });

    // Deploy stable swap contract
    const PlasmaStableSwap = await ethers.getContractFactory("PlasmaStableSwap");
    stableSwap = await upgrades.deployProxy(PlasmaStableSwap, [
      paymaster.address,
      oracle.address,
      guardian.address,
      relayer.address,
    ], {
      initializer: "initialize",
    });

    // Deploy bridge handler
    const PlasmaBridgeHandler = await ethers.getContractFactory("PlasmaBridgeHandler");
    bridgeHandler = await upgrades.deployProxy(PlasmaBridgeHandler, [
      plasmaBridge.address,
      paymaster.address,
      oracle.address,
      guardian.address,
    ], {
      initializer: "initialize",
    });

    // Deploy multiple mock price feeds for redundancy
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    const usdtPriceFeed1 = await MockPriceFeed.deploy();
    const usdtPriceFeed2 = await MockPriceFeed.deploy();
    const usdcPriceFeed1 = await MockPriceFeed.deploy();
    const usdcPriceFeed2 = await MockPriceFeed.deploy();
    const daiPriceFeed1 = await MockPriceFeed.deploy();
    const daiPriceFeed2 = await MockPriceFeed.deploy();
    const wbtcPriceFeed1 = await MockPriceFeed.deploy();
    const wbtcPriceFeed2 = await MockPriceFeed.deploy();
    const wbtcPriceFeed3 = await MockPriceFeed.deploy();
    const wethPriceFeed1 = await MockPriceFeed.deploy();
    const wethPriceFeed2 = await MockPriceFeed.deploy();
    const wethPriceFeed3 = await MockPriceFeed.deploy();

    // Set realistic prices on all feeds
    await usdtPriceFeed1.setPrice(ethers.utils.parseEther("1")); // $1
    await usdtPriceFeed2.setPrice(ethers.utils.parseEther("1")); // $1
    await usdcPriceFeed1.setPrice(ethers.utils.parseEther("1")); // $1
    await usdcPriceFeed2.setPrice(ethers.utils.parseEther("1")); // $1
    await daiPriceFeed1.setPrice(ethers.utils.parseEther("1")); // $1
    await daiPriceFeed2.setPrice(ethers.utils.parseEther("1")); // $1
    await wbtcPriceFeed1.setPrice(ethers.utils.parseEther("45000")); // $45,000
    await wbtcPriceFeed2.setPrice(ethers.utils.parseEther("45000")); // $45,000
    await wbtcPriceFeed3.setPrice(ethers.utils.parseEther("45000")); // $45,000
    await wethPriceFeed1.setPrice(ethers.utils.parseEther("2500")); // $2,500
    await wethPriceFeed2.setPrice(ethers.utils.parseEther("2500")); // $2,500
    await wethPriceFeed3.setPrice(ethers.utils.parseEther("2500")); // $2,500

    // Configure oracle with tokens and multiple price feeds
    await oracle.addToken(usdt.address, 2, 100, 300, true);
    await oracle.addToken(usdc.address, 2, 100, 300, true);
    await oracle.addToken(dai.address, 2, 150, 300, true);
    await oracle.addToken(wbtc.address, 3, 500, 600, false);
    await oracle.addToken(weth.address, 3, 500, 600, false);

    // Add multiple price sources to oracle for redundancy
    await oracle.addPriceSource(usdt.address, usdtPriceFeed1.address);
    await oracle.addPriceSource(usdt.address, usdtPriceFeed2.address);
    await oracle.addPriceSource(usdc.address, usdcPriceFeed1.address);
    await oracle.addPriceSource(usdc.address, usdcPriceFeed2.address);
    await oracle.addPriceSource(dai.address, daiPriceFeed1.address);
    await oracle.addPriceSource(dai.address, daiPriceFeed2.address);
    await oracle.addPriceSource(wbtc.address, wbtcPriceFeed1.address);
    await oracle.addPriceSource(wbtc.address, wbtcPriceFeed2.address);
    await oracle.addPriceSource(wbtc.address, wbtcPriceFeed3.address);
    await oracle.addPriceSource(weth.address, wethPriceFeed1.address);
    await oracle.addPriceSource(weth.address, wethPriceFeed2.address);
    await oracle.addPriceSource(weth.address, wethPriceFeed3.address);

    // Update prices in oracle
    await oracle.updatePrice(usdt.address);
    await oracle.updatePrice(usdc.address);
    await oracle.updatePrice(dai.address);
    await oracle.updatePrice(wbtc.address);
    await oracle.updatePrice(weth.address);

    // Add supported tokens to swap contract
    await stableSwap.addSupportedToken(usdt.address, true);
    await stableSwap.addSupportedToken(usdc.address, true);
    await stableSwap.addSupportedToken(dai.address, true);
    await stableSwap.addSupportedToken(wbtc.address, false);
    await stableSwap.addSupportedToken(weth.address, false);

    // Set USDT address for gasless transfers
    await stableSwap.setUSDTAddress(usdt.address);

    // Configure bridge handler
    await bridgeHandler.setSupportedToken(usdt.address, true);
    await bridgeHandler.setSupportedToken(usdc.address, true);
    await bridgeHandler.setSupportedToken(dai.address, true);
    await bridgeHandler.setSupportedToken(wbtc.address, true);
    await bridgeHandler.setSupportedToken(weth.address, true);

    // Mark stablecoins in bridge handler
    await bridgeHandler.setStablecoin(usdt.address, true);
    await bridgeHandler.setStablecoin(usdc.address, true);
    await bridgeHandler.setStablecoin(dai.address, true);
    
    // Set very low minimum bridge amounts
    await bridgeHandler.setTokenLimits(usdt.address, 1, ethers.utils.parseUnits("1000000", 6));
    await bridgeHandler.setTokenLimits(usdc.address, 1, ethers.utils.parseUnits("1000000", 6));
    await bridgeHandler.setTokenLimits(dai.address, 1, ethers.utils.parseEther("1000000"));

    // Add supported chains
    await bridgeHandler.setSupportedChain(1, true); // Ethereum
    await bridgeHandler.setSupportedChain(56, true); // BSC
    await bridgeHandler.setSupportedChain(137, true); // Polygon

    // Mint tokens to users
    const mintAmount = ethers.utils.parseUnits("1000000", 18);
    await usdt.mint(owner.address, ethers.utils.parseUnits("1000000", 6));
    await usdc.mint(owner.address, ethers.utils.parseUnits("1000000", 6));
    await dai.mint(owner.address, mintAmount);
    await wbtc.mint(owner.address, ethers.utils.parseUnits("100", 8));
    await weth.mint(owner.address, mintAmount);

    await usdt.mint(user1.address, ethers.utils.parseUnits("10000", 6));
    await usdc.mint(user1.address, ethers.utils.parseUnits("10000", 6));
    await dai.mint(user1.address, ethers.utils.parseEther("10000"));

    // Seed initial liquidity
    const seedAmount = ethers.utils.parseUnits("50000", 6);
    await usdt.approve(stableSwap.address, seedAmount);
    await usdc.approve(stableSwap.address, seedAmount);
    await dai.approve(stableSwap.address, ethers.utils.parseEther("50000"));
    await wbtc.approve(stableSwap.address, ethers.utils.parseUnits("5", 8));
    await weth.approve(stableSwap.address, ethers.utils.parseEther("50"));

    await stableSwap.seedLiquidity(usdt.address, seedAmount);
    await stableSwap.seedLiquidity(usdc.address, seedAmount);
    await stableSwap.seedLiquidity(dai.address, ethers.utils.parseEther("50000"));
    await stableSwap.seedLiquidity(wbtc.address, ethers.utils.parseUnits("2", 8));
    await stableSwap.seedLiquidity(weth.address, ethers.utils.parseEther("20"));
  });

  describe("Stablecoin Swapping", function () {
    it("should perform USDT to USDC swap with minimal slippage", async function () {
      const swapAmount = ethers.utils.parseUnits("100", 6);
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await usdt.connect(user1).approve(stableSwap.address, swapAmount);

      const usdtBefore = await usdt.balanceOf(user1.address);
      const usdcBefore = await usdc.balanceOf(user1.address);

      // Calculate expected output
      const calculatedOutput = await stableSwap.calculateSwap(0, 1, swapAmount);
      console.log("Calculated output for USDT->USDC:", ethers.utils.formatUnits(calculatedOutput, 6));

      await expect(
        stableSwap.connect(user1).swap(
          usdt.address,
          usdc.address,
          swapAmount,
          0,
          deadline,
          false
        )
      ).to.emit(stableSwap, "TokenSwapped");

      const usdtAfter = await usdt.balanceOf(user1.address);
      const usdcAfter = await usdc.balanceOf(user1.address);

      expect(usdtBefore.sub(usdtAfter)).to.equal(swapAmount);
      expect(usdcAfter.gt(usdcBefore)).to.be.true;
      
      // For stablecoin-to-stablecoin, expect near 1:1 ratio (minimal fees)
      const outputAmount = usdcAfter.sub(usdcBefore);
      const slippage = swapAmount.sub(outputAmount).mul(10000).div(swapAmount);
      console.log("Slippage:", slippage.toString(), "basis points");
      expect(slippage.lt(100)).to.be.true; // Less than 1% slippage
    });

    it("should handle USDT to wBTC swap with proper price calculation", async function () {
      const swapAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDT
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await usdt.connect(user1).approve(stableSwap.address, swapAmount);

      const usdtBefore = await usdt.balanceOf(user1.address);
      const wbtcBefore = await wbtc.balanceOf(user1.address);

      await expect(
        stableSwap.connect(user1).swap(
          usdt.address,
          wbtc.address,
          swapAmount,
          0,
          deadline,
          false
        )
      ).to.emit(stableSwap, "TokenSwapped");

      const usdtAfter = await usdt.balanceOf(user1.address);
      const wbtcAfter = await wbtc.balanceOf(user1.address);

      expect(usdtBefore.sub(usdtAfter)).to.equal(swapAmount);
      expect(wbtcAfter.gt(wbtcBefore)).to.be.true;

      const wbtcReceived = wbtcAfter.sub(wbtcBefore);
      console.log("wBTC received for 1000 USDT:", ethers.utils.formatUnits(wbtcReceived, 8));
      
      // Add delay to avoid rate limiting
      await network.provider.send("evm_increaseTime", [65]); // 65 seconds
      await network.provider.send("evm_mine");
    });

    it("should handle DAI to USDT swap (18 to 6 decimals)", async function () {
      const swapAmount = ethers.utils.parseEther("100"); // 100 DAI
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await dai.connect(user1).approve(stableSwap.address, swapAmount);

      const daiBefore = await dai.balanceOf(user1.address);
      const usdtBefore = await usdt.balanceOf(user1.address);

      await expect(
        stableSwap.connect(user1).swap(
          dai.address,
          usdt.address,
          swapAmount,
          0,
          deadline,
          false
        )
      ).to.emit(stableSwap, "TokenSwapped");

      const daiAfter = await dai.balanceOf(user1.address);
      const usdtAfter = await usdt.balanceOf(user1.address);

      expect(daiBefore.sub(daiAfter)).to.equal(swapAmount);
      expect(usdtAfter.gt(usdtBefore)).to.be.true;

      const usdtReceived = usdtAfter.sub(usdtBefore);
      console.log("USDT received for 100 DAI:", ethers.utils.formatUnits(usdtReceived, 6));
    });
  });

  describe("Cross-chain Bridging", function () {
    it("should bridge USDT to Ethereum", async function () {
      const bridgeAmount = ethers.utils.parseUnits("500", 6);
      const destinationChain = 1; // Ethereum

      await usdt.connect(user1).approve(bridgeHandler.address, bridgeAmount);

      const usdtBefore = await usdt.balanceOf(user1.address);

      await expect(
        bridgeHandler.connect(user1).bridgeOut(
          usdt.address,
          bridgeAmount,
          user1.address,
          destinationChain
        )
      ).to.emit(bridgeHandler, "BridgeOutInitiated");

      const usdtAfter = await usdt.balanceOf(user1.address);
      expect(usdtBefore.sub(usdtAfter)).to.equal(bridgeAmount);
    });

    it("should estimate bridge fees correctly", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      
      const [fee, bridgeAmount] = await bridgeHandler.estimateBridgeFee(usdt.address, amount);
      
      console.log("Bridge fee:", ethers.utils.formatUnits(fee, 6), "USDT");
      console.log("Bridge amount:", ethers.utils.formatUnits(bridgeAmount, 6), "USDT");
      
      expect(fee.gt(0)).to.be.true;
      expect(bridgeAmount.lt(amount)).to.be.true;
      expect(fee.add(bridgeAmount)).to.equal(amount);
    });

    it("should handle gasless USDT transfer for eligible users", async function () {
      // Set user as eligible for gasless transfers
      await paymaster.setEligible(user1.address, usdt.address, true);
      
      const bridgeAmount = ethers.utils.parseUnits("100", 6);
      const destinationChain = 137; // Polygon

      await usdt.connect(user1).approve(bridgeHandler.address, bridgeAmount);

      await expect(
        bridgeHandler.connect(user1).gaslessUSDTTransfer(
          usdt.address,
          bridgeAmount,
          user1.address,
          destinationChain
        )
      ).to.emit(bridgeHandler, "BridgeOutInitiated");
    });
  });

  describe("Oracle Integration", function () {
    it("should provide accurate price data", async function () {
      const usdtPrice = await oracle.getPrice(usdt.address);
      const wbtcPrice = await oracle.getPrice(wbtc.address);
      
      console.log("USDT price:", ethers.utils.formatEther(usdtPrice));
      console.log("wBTC price:", ethers.utils.formatEther(wbtcPrice));
      
      expect(usdtPrice).to.equal(ethers.utils.parseEther("1"));
      expect(wbtcPrice).to.equal(ethers.utils.parseEther("45000"));
    });

    it("should detect stale prices", async function () {
      const isStale = await oracle.isStale(usdt.address);
      expect(isStale).to.be.false;
    });

    it("should handle price updates", async function () {
      await oracle.updatePrice(usdt.address);
      
      const priceData = await oracle.getPriceData(usdt.address);
      expect(priceData.isValid).to.be.true;
      expect(priceData.price).to.equal(ethers.utils.parseEther("1"));
    });
  });

  describe("Security and Emergency Controls", function () {
    it("should allow guardian to pause contracts", async function () {
      await stableSwap.connect(guardian).pause();
      expect(await stableSwap.paused()).to.be.true;
      
      await stableSwap.unpause();
      expect(await stableSwap.paused()).to.be.false;
    });

    it("should respect daily volume limits", async function () {
      const volumeCap = ethers.utils.parseUnits("100", 6);
      await stableSwap.setDailyVolumeCap(user2.address, volumeCap);
      
      // Try to exceed daily volume
      const largeAmount = ethers.utils.parseUnits("200", 6);
      await usdt.mint(user2.address, largeAmount);
      await usdt.connect(user2).approve(stableSwap.address, largeAmount);
      
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      await expect(
        stableSwap.connect(user2).swap(
          usdt.address,
          usdc.address,
          largeAmount,
          0,
          deadline,
          false
        )
      ).to.be.revertedWith("PS: Daily volume exceeded");
    });

    it("should allow emergency token rescue", async function () {
      await stableSwap.connect(guardian).setEmergencyStop(true);
      
      const rescueAmount = ethers.utils.parseUnits("100", 6);
      await expect(
        stableSwap.connect(guardian).emergencyRescue(
          usdt.address,
          rescueAmount,
          guardian.address
        )
      ).not.to.be.reverted;
      
      await stableSwap.connect(guardian).setEmergencyStop(false);
    });
  });

  describe("System Statistics", function () {
    it("should provide accurate pool statistics", async function () {
      const stats = await stableSwap.getPoolStats();
      
      console.log("Total pool value:", ethers.utils.formatEther(stats.totalValue));
      console.log("Token count:", stats.tokenCount.toString());
      console.log("Current A:", stats.currentA.toString());
      
      expect(stats.tokenCount).to.equal(5);
      expect(stats.totalValue.gt(0)).to.be.true;
    });

    it("should track bridge statistics", async function () {
      const stats = await bridgeHandler.getBridgeStats();
      
      console.log("Total bridge volume:", ethers.utils.formatEther(stats.totalVolume));
      console.log("Total transactions:", stats.totalTransactions.toString());
      
      expect(stats.totalVolume.gt(0)).to.be.true;
    });
  });
});
