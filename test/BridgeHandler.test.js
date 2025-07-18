const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("PlasmaBridgeHandler", function () {
  let bridgeHandler, mockBridge, mockPaymaster, mockOracle;
  let owner, guardian, user1, user2;
  let usdt, usdc, dai, wbtc, weth;

  beforeEach(async function () {
    [owner, guardian, user1, user2] = await ethers.getSigners();

    // Deploy mock contracts
    const MockBridge = await ethers.getContractFactory("MockBridge");
    mockBridge = await MockBridge.deploy();

    const MockPaymaster = await ethers.getContractFactory("MockPaymaster");
    mockPaymaster = await MockPaymaster.deploy();

    const PlasmaOracle = await ethers.getContractFactory("PlasmaOracle");
    const mockOracle = await PlasmaOracle.deploy();

    // Deploy test tokens
    const MockToken = await ethers.getContractFactory("MockERC20");
    usdt = await MockToken.deploy("Tether USD", "USDT", 6);
    usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    dai = await MockToken.deploy("Dai Stablecoin", "DAI", 18);
    wbtc = await MockToken.deploy("Wrapped Bitcoin", "wBTC", 8);
    weth = await MockToken.deploy("Wrapped Ethereum", "wETH", 18);

    // Deploy PlasmaBridgeHandler as upgradeable
    const BridgeHandler = await ethers.getContractFactory("PlasmaBridgeHandler");
    bridgeHandler = await upgrades.deployProxy(BridgeHandler, [
      mockBridge.address,
      mockPaymaster.address,
      mockOracle.address,
      guardian.address
    ]);

    // Setup tokens
    await usdt.mint(user1.address, ethers.utils.parseUnits("1000000", 6)); // 1M USDT
    await usdc.mint(user1.address, ethers.utils.parseUnits("1000000", 6)); // 1M USDC
    await dai.mint(user1.address, ethers.utils.parseEther("1000000")); // 1M DAI
    await wbtc.mint(user1.address, ethers.utils.parseUnits("100", 8)); // 100 wBTC
    await weth.mint(user1.address, ethers.utils.parseEther("10000")); // 10K wETH

    // Setup second user
    await usdt.mint(user2.address, ethers.utils.parseUnits("1000000", 6));
    await usdc.mint(user2.address, ethers.utils.parseUnits("1000000", 6));
    await dai.mint(user2.address, ethers.utils.parseEther("1000000"));

    // Fund the bridge handler with tokens for bridgeIn operations
    await usdt.mint(bridgeHandler.address, ethers.utils.parseUnits("1000000", 6));
    await usdc.mint(bridgeHandler.address, ethers.utils.parseUnits("1000000", 6));
    await dai.mint(bridgeHandler.address, ethers.utils.parseEther("1000000"));

    // Configure bridge handler
    await bridgeHandler.setSupportedToken(usdt.address, true);
    await bridgeHandler.setSupportedToken(usdc.address, true);
    await bridgeHandler.setSupportedToken(dai.address, true);
    await bridgeHandler.setSupportedToken(wbtc.address, true);
    await bridgeHandler.setSupportedToken(weth.address, true);

    // Setup supported chains
    await bridgeHandler.setSupportedChain(1, true); // Ethereum
    await bridgeHandler.setSupportedChain(56, true); // BSC
    await bridgeHandler.setSupportedChain(137, true); // Polygon

    // Approve tokens for bridge handler
    await usdt.connect(user1).approve(bridgeHandler.address, ethers.constants.MaxUint256);
    await usdc.connect(user1).approve(bridgeHandler.address, ethers.constants.MaxUint256);
    await dai.connect(user1).approve(bridgeHandler.address, ethers.constants.MaxUint256);
    await wbtc.connect(user1).approve(bridgeHandler.address, ethers.constants.MaxUint256);
    await weth.connect(user1).approve(bridgeHandler.address, ethers.constants.MaxUint256);

    await usdt.connect(user2).approve(bridgeHandler.address, ethers.constants.MaxUint256);
    await usdc.connect(user2).approve(bridgeHandler.address, ethers.constants.MaxUint256);
    await dai.connect(user2).approve(bridgeHandler.address, ethers.constants.MaxUint256);
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await bridgeHandler.plasmaBridge()).to.equal(mockBridge.address);
      expect(await bridgeHandler.plasmaPaymaster()).to.equal(mockPaymaster.address);
      expect(await bridgeHandler.priceOracle()).to.equal(mockOracle.address);
      expect(await bridgeHandler.guardian()).to.equal(guardian.address);
      expect(await bridgeHandler.bridgeFee()).to.equal(5); // 0.05%
      expect(await bridgeHandler.minBridgeAmount()).to.equal(ethers.utils.parseEther("1"));
      expect(await bridgeHandler.maxBridgeAmount()).to.equal(ethers.utils.parseEther("1000000"));
    });

    it("Should set owner correctly", async function () {
      expect(await bridgeHandler.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await bridgeHandler.FEE_DENOMINATOR()).to.equal(10000);
      expect(await bridgeHandler.MAX_BRIDGE_FEE()).to.equal(100);
      expect(await bridgeHandler.RATE_LIMIT_WINDOW()).to.equal(3600);
      expect(await bridgeHandler.MAX_DAILY_VOLUME()).to.equal(ethers.utils.parseEther("1000000"));
    });
  });

  describe("Token Management", function () {
    it("Should support adding tokens", async function () {
      const newToken = await (await ethers.getContractFactory("MockERC20")).deploy("New Token", "NEW", 18);
      
      await expect(bridgeHandler.setSupportedToken(newToken.address, true))
        .to.emit(bridgeHandler, "TokenSupported")
        .withArgs(newToken.address, true);

      expect(await bridgeHandler.supportedTokens(newToken.address)).to.be.true;
    });

    it("Should support removing tokens", async function () {
      await expect(bridgeHandler.setSupportedToken(usdt.address, false))
        .to.emit(bridgeHandler, "TokenSupported")
        .withArgs(usdt.address, false);

      expect(await bridgeHandler.supportedTokens(usdt.address)).to.be.false;
    });

    it("Should only allow owner to manage tokens", async function () {
      await expect(bridgeHandler.connect(user1).setSupportedToken(usdt.address, false))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should set token limits", async function () {
      const minAmount = ethers.utils.parseUnits("100", 6);
      const maxAmount = ethers.utils.parseUnits("100000", 6);

      await bridgeHandler.setTokenLimits(usdt.address, minAmount, maxAmount);

      expect(await bridgeHandler.tokenMinAmounts(usdt.address)).to.equal(minAmount);
      expect(await bridgeHandler.tokenMaxAmounts(usdt.address)).to.equal(maxAmount);
    });

    it("Should reject invalid token limits", async function () {
      const minAmount = ethers.utils.parseUnits("100000", 6);
      const maxAmount = ethers.utils.parseUnits("100", 6);

      await expect(bridgeHandler.setTokenLimits(usdt.address, minAmount, maxAmount))
        .to.be.revertedWith("PBH: Invalid limits");
    });
  });

  describe("Chain Management", function () {
    it("Should support adding chains", async function () {
      await expect(bridgeHandler.setSupportedChain(42, true))
        .to.emit(bridgeHandler, "ChainSupported")
        .withArgs(42, true);

      expect(await bridgeHandler.supportedChains(42)).to.be.true;
    });

    it("Should support removing chains", async function () {
      await expect(bridgeHandler.setSupportedChain(1, false))
        .to.emit(bridgeHandler, "ChainSupported")
        .withArgs(1, false);

      expect(await bridgeHandler.supportedChains(1)).to.be.false;
    });

    it("Should set chain-specific bridge fees", async function () {
      await bridgeHandler.setChainBridgeFee(1, 10); // 0.1%
      expect(await bridgeHandler.chainBridgeFees(1)).to.equal(10);
    });

    it("Should reject high chain fees", async function () {
      await expect(bridgeHandler.setChainBridgeFee(1, 200))
        .to.be.revertedWith("PBH: Fee too high");
    });

    it("Should pause and unpause chains", async function () {
      await bridgeHandler.connect(guardian).setChainPaused(1, true);
      expect(await bridgeHandler.chainPaused(1)).to.be.true;

      await bridgeHandler.connect(guardian).setChainPaused(1, false);
      expect(await bridgeHandler.chainPaused(1)).to.be.false;
    });
  });

  describe("Bridge Fee Management", function () {
    it("Should set bridge fee", async function () {
      await bridgeHandler.setBridgeFee(10); // 0.1%
      expect(await bridgeHandler.bridgeFee()).to.equal(10);
    });

    it("Should reject high bridge fees", async function () {
      await expect(bridgeHandler.setBridgeFee(200))
        .to.be.revertedWith("Fee too high");
    });

    it("Should estimate bridge fees correctly", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      const [fee, bridgeAmount] = await bridgeHandler.estimateBridgeFee(usdt.address, amount);
      
      expect(fee).to.equal(amount.mul(5).div(10000)); // 0.05%
      expect(bridgeAmount).to.equal(amount.sub(fee));
    });
  });

  describe("Bridge Out Operations", function () {
    it("Should bridge out USDT successfully", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      const recipient = user2.address;
      const destinationChainId = 1;

      await expect(bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        recipient,
        destinationChainId
      )).to.emit(bridgeHandler, "BridgeOutInitiated");

      // Check token balance decreased
      expect(await usdt.balanceOf(user1.address)).to.equal(
        ethers.utils.parseUnits("999000", 6)
      );
    });

    it("Should bridge out DAI successfully", async function () {
      const amount = ethers.utils.parseEther("1000");
      const recipient = user2.address;
      const destinationChainId = 56;

      await expect(bridgeHandler.connect(user1).bridgeOut(
        dai.address,
        amount,
        recipient,
        destinationChainId
      )).to.emit(bridgeHandler, "BridgeOutInitiated");
    });

    it("Should bridge out wBTC successfully", async function () {
      const amount = ethers.utils.parseUnits("1", 8);
      const recipient = user2.address;
      const destinationChainId = 137;

      await expect(bridgeHandler.connect(user1).bridgeOut(
        wbtc.address,
        amount,
        recipient,
        destinationChainId
      )).to.emit(bridgeHandler, "BridgeOutInitiated");
    });

    it("Should reject bridging unsupported tokens", async function () {
      const unsupportedToken = await (await ethers.getContractFactory("MockERC20")).deploy("Unsupported", "UNS", 18);
      const amount = ethers.utils.parseEther("1000");

      await expect(bridgeHandler.connect(user1).bridgeOut(
        unsupportedToken.address,
        amount,
        user2.address,
        1
      )).to.be.revertedWith("Token not supported");
    });

    it("Should reject bridging to unsupported chains", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);

      await expect(bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        999 // Unsupported chain
      )).to.be.revertedWith("Chain not supported");
    });

    it("Should reject amounts below minimum", async function () {
      const amount = ethers.utils.parseUnits("0.1", 6);

      await expect(bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        1
      )).to.be.revertedWith("Amount too small");
    });

    it("Should reject amounts above maximum", async function () {
      const amount = ethers.utils.parseUnits("2000000", 6);

      await expect(bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        1
      )).to.be.revertedWith("Amount too large");
    });

    it("Should reject zero recipient", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);

      await expect(bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        ethers.constants.AddressZero,
        1
      )).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Bridge Native Operations", function () {
    it("Should bridge native tokens successfully", async function () {
      const amount = ethers.utils.parseEther("1");
      const recipient = user2.address;
      const destinationChainId = 1;

      await expect(bridgeHandler.connect(user1).bridgeNativeOut(
        recipient,
        destinationChainId,
        { value: amount }
      )).to.emit(bridgeHandler, "BridgeOutInitiated");
    });

    it("Should reject native bridge below minimum", async function () {
      const amount = ethers.utils.parseEther("0.1");

      await expect(bridgeHandler.connect(user1).bridgeNativeOut(
        user2.address,
        1,
        { value: amount }
      )).to.be.revertedWith("Amount too small");
    });

    it("Should reject native bridge above maximum", async function () {
      const amount = ethers.utils.parseEther("2000000");

      await expect(bridgeHandler.connect(user1).bridgeNativeOut(
        user2.address,
        1,
        { value: amount }
      )).to.be.revertedWith("Amount too large");
    });
  });

  describe("Bridge In Operations", function () {
    it("Should bridge in USDT successfully", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      const recipient = user2.address;
      const sourceChainId = 1;
      const bridgeId = 1;

      const initialBalance = await usdt.balanceOf(recipient);

      await expect(bridgeHandler.connect(mockBridge.address).bridgeIn(
        usdt.address,
        amount,
        recipient,
        sourceChainId,
        bridgeId
      )).to.emit(bridgeHandler, "BridgeInCompleted");

      expect(await usdt.balanceOf(recipient)).to.equal(initialBalance.add(amount));
    });

    it("Should reject bridge in from unauthorized caller", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);

      await expect(bridgeHandler.connect(user1).bridgeIn(
        usdt.address,
        amount,
        user2.address,
        1,
        1
      )).to.be.revertedWith("Unauthorized caller");
    });

    it("Should reject bridge in with zero amount", async function () {
      await expect(bridgeHandler.connect(mockBridge.address).bridgeIn(
        usdt.address,
        0,
        user2.address,
        1,
        1
      )).to.be.revertedWith("Invalid amount");
    });

    it("Should reject bridge in with zero recipient", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);

      await expect(bridgeHandler.connect(mockBridge.address).bridgeIn(
        usdt.address,
        amount,
        ethers.constants.AddressZero,
        1,
        1
      )).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Rate Limiting", function () {
    it("Should enforce daily volume limits", async function () {
      const largeAmount = ethers.utils.parseUnits("1000001", 6); // Above daily limit

      await expect(bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        largeAmount,
        user2.address,
        1
      )).to.be.revertedWith("Daily volume exceeded");
    });

    it("Should enforce transaction cooldown", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);

      // First transaction should succeed
      await bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        1
      );

      // Second transaction immediately should fail
      await expect(bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        1
      )).to.be.revertedWith("Rate limit exceeded");
    });

    it("Should track daily volume correctly", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      
      await bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        1
      );

      const dailyVolume = await bridgeHandler.getUserDailyVolume(user1.address);
      expect(dailyVolume).to.equal(amount);
    });
  });

  describe("Access Control", function () {
    it("Should allow owner to pause and unpause", async function () {
      await bridgeHandler.pause();
      expect(await bridgeHandler.paused()).to.be.true;

      await bridgeHandler.unpause();
      expect(await bridgeHandler.paused()).to.be.false;
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(bridgeHandler.connect(user1).pause())
        .to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow guardian to emergency withdraw", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      
      await expect(bridgeHandler.connect(guardian).emergencyWithdraw(
        usdt.address,
        amount,
        guardian.address
      )).to.emit(bridgeHandler, "EmergencyWithdrawal");
    });

    it("Should prevent non-guardian from emergency withdraw", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      
      await expect(bridgeHandler.connect(user1).emergencyWithdraw(
        usdt.address,
        amount,
        user1.address
      )).to.be.revertedWith("Not guardian");
    });
  });

  describe("Blacklist Management", function () {
    it("Should allow guardian to blacklist users", async function () {
      await bridgeHandler.connect(guardian).setUserBlacklisted(user1.address, true);
      expect(await bridgeHandler.blacklistedUsers(user1.address)).to.be.true;
    });

    it("Should prevent non-guardian from blacklisting", async function () {
      await expect(bridgeHandler.connect(user1).setUserBlacklisted(user2.address, true))
        .to.be.revertedWith("Not guardian");
    });
  });

  describe("Bridge Statistics", function () {
    it("Should track bridge statistics", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      
      await bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        1
      );

      const [totalVolume, totalTransactions, activeUsers] = await bridgeHandler.getBridgeStats();
      expect(totalTransactions).to.equal(0); // No bridge-in yet
      expect(activeUsers).to.equal(0); // Not implemented in contract
    });
  });

  describe("Bitcoin Bridge", function () {
    it("Should allow setting Bitcoin bridge address", async function () {
      const bitcoinBridge = user1.address; // Mock address
      await bridgeHandler.setBitcoinBridge(bitcoinBridge);
      expect(await bridgeHandler.bitcoinBridge()).to.equal(bitcoinBridge);
    });

    it("Should handle Bitcoin bridge transactions", async function () {
      const bitcoinBridge = user1.address;
      await bridgeHandler.setBitcoinBridge(bitcoinBridge);

      const btcTxHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("btc_tx_hash"));
      
      await expect(bridgeHandler.connect(user1).bridgeBitcoin(
        user2.address,
        1,
        btcTxHash,
        false
      )).to.emit(bridgeHandler, "BridgeOutInitiated");
    });

    it("Should reject duplicate Bitcoin transactions", async function () {
      const bitcoinBridge = user1.address;
      await bridgeHandler.setBitcoinBridge(bitcoinBridge);

      const btcTxHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("btc_tx_hash"));
      
      await bridgeHandler.connect(user1).bridgeBitcoin(
        user2.address,
        1,
        btcTxHash,
        false
      );

      await expect(bridgeHandler.connect(user1).bridgeBitcoin(
        user2.address,
        1,
        btcTxHash,
        false
      )).to.be.revertedWith("PBH: Transaction already processed");
    });
  });

  describe("Bridge Transaction Management", function () {
    it("Should store and retrieve bridge transaction details", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      
      await bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        1
      );

      const bridgeId = 1;
      const transaction = await bridgeHandler.getBridgeTransaction(bridgeId);
      expect(transaction.user).to.equal(user1.address);
      expect(transaction.token).to.equal(usdt.address);
      expect(transaction.amount).to.equal(amount);
    });

    it("Should track user bridge history", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      
      await bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        1
      );

      const userBridges = await bridgeHandler.getUserBridges(user1.address);
      expect(userBridges.length).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle contract receiving native tokens", async function () {
      const amount = ethers.utils.parseEther("1");
      
      await expect(user1.sendTransaction({
        to: bridgeHandler.address,
        value: amount
      })).to.not.be.reverted;
    });

    it("Should handle zero address emergency withdrawal for native tokens", async function () {
      const amount = ethers.utils.parseEther("1");
      
      // First send some native tokens to contract
      await user1.sendTransaction({
        to: bridgeHandler.address,
        value: amount
      });

      await expect(bridgeHandler.connect(guardian).emergencyWithdraw(
        ethers.constants.AddressZero,
        amount,
        guardian.address
      )).to.emit(bridgeHandler, "EmergencyWithdrawal");
    });

    it("Should validate limits correctly", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);
      expect(await bridgeHandler.isWithinLimits(usdt.address, amount)).to.be.true;

      const tooSmall = ethers.utils.parseUnits("0.1", 6);
      expect(await bridgeHandler.isWithinLimits(usdt.address, tooSmall)).to.be.false;

      const tooLarge = ethers.utils.parseUnits("2000000", 6);
      expect(await bridgeHandler.isWithinLimits(usdt.address, tooLarge)).to.be.false;
    });

    it("Should get effective bridge fees correctly", async function () {
      // Default fee
      expect(await bridgeHandler.getEffectiveBridgeFee(usdt.address, 1)).to.equal(5);

      // Chain-specific fee
      await bridgeHandler.setChainBridgeFee(1, 10);
      expect(await bridgeHandler.getEffectiveBridgeFee(usdt.address, 1)).to.equal(10);
    });
  });

  describe("Paused State", function () {
    beforeEach(async function () {
      await bridgeHandler.pause();
    });

    it("Should prevent bridge out when paused", async function () {
      const amount = ethers.utils.parseUnits("1000", 6);

      await expect(bridgeHandler.connect(user1).bridgeOut(
        usdt.address,
        amount,
        user2.address,
        1
      )).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent native bridge out when paused", async function () {
      const amount = ethers.utils.parseEther("1");

      await expect(bridgeHandler.connect(user1).bridgeNativeOut(
        user2.address,
        1,
        { value: amount }
      )).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent Bitcoin bridge when paused", async function () {
      const bitcoinBridge = user1.address;
      await bridgeHandler.setBitcoinBridge(bitcoinBridge);

      const btcTxHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("btc_tx_hash"));
      
      await expect(bridgeHandler.connect(user1).bridgeBitcoin(
        user2.address,
        1,
        btcTxHash,
        false
      )).to.be.revertedWith("Pausable: paused");
    });
  });
});
