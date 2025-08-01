const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("PlasmaStableSwap - Swap Only Implementation", function () {
  let stableSwap, oracle, paymaster;
  let usdt, usdc, dai, wbtc, weth;
  let owner, guardian, relayer, user1;

  before(async function () {
    [owner, guardian, relayer, user1] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdt = await MockERC20.deploy("USD Tether", "USDT", 6);
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
    wbtc = await MockERC20.deploy("Wrapped Bitcoin", "wBTC", 8);
    weth = await MockERC20.deploy("Wrapped Ethereum", "wETH", 18);

    // Deploy oracle
    const PlasmaOracle = await ethers.getContractFactory("PlasmaOracle");
    oracle = await upgrades.deployProxy(PlasmaOracle, [
      guardian.address
    ], { initializer: "initialize" });

    // Deploy paymaster
    const MockPaymaster = await ethers.getContractFactory("MockPaymaster");
    paymaster = await MockPaymaster.deploy();

    // Deploy stable swap
    const PlasmaStableSwap = await ethers.getContractFactory("PlasmaStableSwap");
    stableSwap = await upgrades.deployProxy(PlasmaStableSwap, [
      paymaster.address,
      oracle.address,
      guardian.address,
      relayer.address
    ], { initializer: "initialize" });

    // Deploy mock price feeds
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

    // Set prices for mock feeds
    await usdtPriceFeed1.setPrice(ethers.utils.parseEther("1"));
    await usdtPriceFeed2.setPrice(ethers.utils.parseEther("1"));
    await usdcPriceFeed1.setPrice(ethers.utils.parseEther("1"));
    await usdcPriceFeed2.setPrice(ethers.utils.parseEther("1"));
    await daiPriceFeed1.setPrice(ethers.utils.parseEther("1"));
    await daiPriceFeed2.setPrice(ethers.utils.parseEther("1"));
    await wbtcPriceFeed1.setPrice(ethers.utils.parseEther("45000"));
    await wbtcPriceFeed2.setPrice(ethers.utils.parseEther("45000"));
    await wbtcPriceFeed3.setPrice(ethers.utils.parseEther("45000"));
    await wethPriceFeed1.setPrice(ethers.utils.parseEther("2500"));
    await wethPriceFeed2.setPrice(ethers.utils.parseEther("2500"));
    await wethPriceFeed3.setPrice(ethers.utils.parseEther("2500"));

    // Configure oracle
    await oracle.addToken(usdt.address, 2, 100, 300, true);
    await oracle.addToken(usdc.address, 2, 100, 300, true);
    await oracle.addToken(dai.address, 2, 150, 300, true);
    await oracle.addToken(wbtc.address, 3, 500, 600, false);
    await oracle.addToken(weth.address, 3, 500, 600, false);

    // Add price sources (minimum 2 for stablecoins, 3 for volatile tokens)
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

    // Update prices to make them active
    await oracle.updatePrice(usdt.address);
    await oracle.updatePrice(usdc.address);
    await oracle.updatePrice(dai.address);
    await oracle.updatePrice(wbtc.address);
    await oracle.updatePrice(weth.address);

    // Add supported tokens to swap
    await stableSwap.addSupportedToken(usdt.address, true);
    await stableSwap.addSupportedToken(usdc.address, true);
    await stableSwap.addSupportedToken(dai.address, true);
    await stableSwap.addSupportedToken(wbtc.address, false);
    await stableSwap.addSupportedToken(weth.address, false);

    // Set USDT address
    await stableSwap.setUSDTAddress(usdt.address);

    // Mint tokens to users
    await usdt.mint(owner.address, ethers.utils.parseUnits("1000000", 6));
    await usdc.mint(owner.address, ethers.utils.parseUnits("1000000", 6));
    await dai.mint(owner.address, ethers.utils.parseEther("1000000"));
    await wbtc.mint(owner.address, ethers.utils.parseUnits("100", 8));
    await weth.mint(owner.address, ethers.utils.parseEther("1000"));

    await usdt.mint(user1.address, ethers.utils.parseUnits("10000", 6));
    await usdc.mint(user1.address, ethers.utils.parseUnits("10000", 6));

    // Seed initial liquidity
    await usdt.approve(stableSwap.address, ethers.utils.parseUnits("50000", 6));
    await usdc.approve(stableSwap.address, ethers.utils.parseUnits("50000", 6));
    await dai.approve(stableSwap.address, ethers.utils.parseEther("50000"));
    await wbtc.approve(stableSwap.address, ethers.utils.parseUnits("5", 8));
    await weth.approve(stableSwap.address, ethers.utils.parseEther("50"));

    await stableSwap.seedLiquidity(usdt.address, ethers.utils.parseUnits("20000", 6));
    await stableSwap.seedLiquidity(usdc.address, ethers.utils.parseUnits("20000", 6));
    await stableSwap.seedLiquidity(dai.address, ethers.utils.parseEther("20000"));
    await stableSwap.seedLiquidity(wbtc.address, ethers.utils.parseUnits("2", 8));
    await stableSwap.seedLiquidity(weth.address, ethers.utils.parseEther("20"));
  });

  describe("Token Swapping", function () {
    beforeEach(async function () {
      // Advance time to avoid rate limiting
      await ethers.provider.send("evm_increaseTime", [61]); // 61 seconds
      await ethers.provider.send("evm_mine");
      
      // Update oracle prices to ensure they're not stale
      await oracle.updatePrice(usdt.address);
      await oracle.updatePrice(usdc.address);
      await oracle.updatePrice(dai.address);
      await oracle.updatePrice(wbtc.address);
      await oracle.updatePrice(weth.address);
    });

    it("should swap USDT to USDC", async function () {
      const swapAmount = ethers.utils.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = currentBlock.timestamp + 3600;

      // Approve tokens
      await usdt.connect(user1).approve(stableSwap.address, swapAmount);

      const usdtBefore = await usdt.balanceOf(user1.address);
      const usdcBefore = await usdc.balanceOf(user1.address);

      // Execute swap
      await expect(
        stableSwap.connect(user1).swap(
          usdt.address,
          usdc.address,
          swapAmount,
          0, // minAmountOut
          deadline,
          false
        )
      ).to.emit(stableSwap, "TokenSwapped");

      const usdtAfter = await usdt.balanceOf(user1.address);
      const usdcAfter = await usdc.balanceOf(user1.address);

      expect(usdtBefore.sub(usdtAfter)).to.equal(swapAmount);
      expect(usdcAfter.gt(usdcBefore)).to.be.true;
    });

    it("should swap USDT to wBTC", async function () {
      const swapAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDT
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = currentBlock.timestamp + 3600;

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
    });

    it("should calculate swap amounts correctly", async function () {
      const swapAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
      
      const calculatedAmount = await stableSwap.calculateSwap(0, 1, swapAmount);
      expect(calculatedAmount).to.be.gt(0);
    });

    it("should reject invalid swap pairs", async function () {
      const swapAmount = ethers.utils.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = currentBlock.timestamp + 3600;

      await expect(
        stableSwap.connect(user1).swap(
          usdt.address,
          usdt.address, // Same token
          swapAmount,
          0,
          deadline,
          false
        )
      ).to.be.revertedWith("PS: Invalid swap pair");
    });

    it("should respect slippage limits", async function () {
      const swapAmount = ethers.utils.parseUnits("100", 6);
      const currentBlock = await ethers.provider.getBlock("latest");
      const deadline = currentBlock.timestamp + 3600;
      const highMinAmount = ethers.utils.parseUnits("1000", 6); // Unrealistic expectation

      await usdt.connect(user1).approve(stableSwap.address, swapAmount);

      await expect(
        stableSwap.connect(user1).swap(
          usdt.address,
          usdc.address,
          swapAmount,
          highMinAmount,
          deadline,
          false
        )
      ).to.be.revertedWith("PS: Slippage exceeded");
    });
  });

  describe("Contract Management", function () {
    it("should allow owner to add new tokens", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const newToken = await MockERC20.deploy("New Token", "NEW", 18);
      
      await stableSwap.addSupportedToken(newToken.address, false);
      expect(await stableSwap.supportedTokens(newToken.address)).to.be.true;
    });

    it("should allow owner to update swap fee", async function () {
      const newFee = 50; // 0.5%
      await stableSwap.setSwapFee(newFee);
      expect(await stableSwap.swapFee()).to.equal(newFee);
    });

    it("should allow guardian to pause contract", async function () {
      await stableSwap.connect(guardian).pause();
      expect(await stableSwap.paused()).to.be.true;
      
      await stableSwap.unpause();
      expect(await stableSwap.paused()).to.be.false;
    });

    it("should get contract statistics", async function () {
      const stats = await stableSwap.getPoolStats();
      expect(stats.tokenCount).to.equal(6); // 5 original + 1 added in previous test
      expect(stats.totalValue).to.be.gt(0);
    });
  });
});
