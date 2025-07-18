const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployAllContracts, setupOracle, mintTokens, setupStableSwap, timeTravel } = require("./helpers");

describe("PlasmaOracle", function () {
  let contracts;
  let accounts;

  beforeEach(async function () {
    ({ contracts, accounts } = await deployAllContracts());
    await setupOracle(contracts.oracle, contracts);
  });

  describe("Initialization", function () {
    it("should initialize with correct guardian", async function () {
      expect(await contracts.oracle.guardian()).to.equal(accounts.guardian.address);
    });

    it("should set owner as authorized updater", async function () {
      expect(await contracts.oracle.authorizedUpdaters(accounts.owner.address)).to.be.true;
    });
  });

  describe("Token Management", function () {
    it("should add token correctly", async function () {
      const tokenConfig = await contracts.oracle.tokenConfigs(contracts.usdt.address);
      expect(tokenConfig.isActive).to.be.true;
      expect(tokenConfig.isStablecoin).to.be.true;
      expect(tokenConfig.minSources).to.equal(2);
    });

    it("should not allow adding token with invalid parameters", async function () {
      await expect(
        contracts.oracle.addToken(ethers.constants.AddressZero, 2, 100, 300, true)
      ).to.be.revertedWith("PO: Invalid token");
    });

    it("should not allow too few sources", async function () {
      await expect(
        contracts.oracle.addToken(contracts.usdt.address, 1, 100, 300, true)
      ).to.be.revertedWith("PO: Too few sources");
    });
  });

  describe("Price Sources", function () {
    it("should add price source correctly", async function () {
      const sources = await contracts.oracle.getPriceSources(contracts.usdt.address);
      expect(sources.length).to.be.gte(2); // We add multiple sources in setup
      expect(sources).to.include(contracts.usdtPriceFeed.address);
    });

    it("should not allow duplicate price sources", async function () {
      await expect(
        contracts.oracle.addPriceSource(contracts.usdt.address, contracts.usdtPriceFeed.address)
      ).to.be.revertedWith("PO: Source already exists");
    });

    it("should remove price source correctly", async function () {
      // First add an additional price source to meet minimum requirements
      const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
      const additionalFeed = await MockPriceFeed.deploy();
      await additionalFeed.setPrice(ethers.utils.parseEther("1"));
      await contracts.oracle.addPriceSource(contracts.usdt.address, additionalFeed.address);
      
      const sourcesBefore = await contracts.oracle.getPriceSources(contracts.usdt.address);
      expect(sourcesBefore.length).to.be.gte(2);
      
      await contracts.oracle.removePriceSource(contracts.usdt.address, additionalFeed.address);
      const sourcesAfter = await contracts.oracle.getPriceSources(contracts.usdt.address);
      expect(sourcesAfter.length).to.equal(sourcesBefore.length - 1);
    });
  });

  describe("Price Updates", function () {
    it("should update price correctly", async function () {
      await contracts.oracle.updatePrice(contracts.usdt.address);
      const price = await contracts.oracle.getPrice(contracts.usdt.address);
      expect(price).to.equal(ethers.utils.parseEther("1"));
    });

    it("should not allow unauthorized price updates", async function () {
      await expect(
        contracts.oracle.connect(accounts.user1).updatePrice(contracts.usdt.address)
      ).to.be.revertedWith("PO: Not authorized");
    });

    it("should check for stale prices", async function () {
      await contracts.oracle.updatePrice(contracts.usdt.address);
      
      // Time travel to make price stale
      await timeTravel(400); // 400 seconds > 300 heartbeat
      
      expect(await contracts.oracle.isStale(contracts.usdt.address)).to.be.true;
    });

    it("should get last update time", async function () {
      const beforeUpdate = await ethers.provider.getBlock("latest");
      await contracts.oracle.updatePrice(contracts.usdt.address);
      const afterUpdate = await ethers.provider.getBlock("latest");
      
      const lastUpdateTime = await contracts.oracle.getLastUpdateTime(contracts.usdt.address);
      expect(lastUpdateTime).to.be.gte(beforeUpdate.timestamp);
      expect(lastUpdateTime).to.be.lte(afterUpdate.timestamp);
    });
  });

  describe("Circuit Breaker", function () {
    beforeEach(async function () {
      await contracts.oracle.updatePrice(contracts.usdt.address);
    });

    it("should activate circuit breaker with emergency price", async function () {
      await contracts.oracle.connect(accounts.guardian).setEmergencyPrice(contracts.usdt.address, ethers.utils.parseEther("0.5"));
      
      expect(await contracts.oracle.circuitBreakerActive(contracts.usdt.address)).to.be.true;
      expect(await contracts.oracle.emergencyPrice(contracts.usdt.address)).to.equal(ethers.utils.parseEther("0.5"));
    });

    it("should return emergency price when circuit breaker is active", async function () {
      const emergencyPrice = ethers.utils.parseEther("0.5");
      await contracts.oracle.connect(accounts.guardian).setEmergencyPrice(contracts.usdt.address, emergencyPrice);
      
      const price = await contracts.oracle.getPrice(contracts.usdt.address);
      expect(price).to.equal(emergencyPrice);
    });

    it("should deactivate circuit breaker", async function () {
      await contracts.oracle.connect(accounts.guardian).setEmergencyPrice(contracts.usdt.address, ethers.utils.parseEther("0.5"));
      await contracts.oracle.connect(accounts.guardian).deactivateCircuitBreaker(contracts.usdt.address);
      
      expect(await contracts.oracle.circuitBreakerActive(contracts.usdt.address)).to.be.false;
      expect(await contracts.oracle.emergencyPrice(contracts.usdt.address)).to.equal(0);
    });

    it("should not allow non-guardian to set emergency price", async function () {
      await expect(
        contracts.oracle.connect(accounts.user1).setEmergencyPrice(contracts.usdt.address, ethers.utils.parseEther("0.5"))
      ).to.be.revertedWith("PO: Not guardian");
    });
  });

  describe("Price Data", function () {
    beforeEach(async function () {
      await contracts.oracle.updatePrice(contracts.usdt.address);
    });

    it("should get price data with metadata", async function () {
      const priceData = await contracts.oracle.getPriceData(contracts.usdt.address);
      expect(priceData.price).to.equal(ethers.utils.parseEther("1"));
      expect(priceData.confidence).to.be.gt(0);
      expect(priceData.isValid).to.be.true;
    });

    it("should return invalid price data when stale", async function () {
      await timeTravel(400);
      const priceData = await contracts.oracle.getPriceData(contracts.usdt.address);
      expect(priceData.isValid).to.be.false;
    });
  });

  describe("TWAP Calculations", function () {
    it("should calculate TWAP correctly", async function () {
      // Update price multiple times
      await contracts.oracle.updatePrice(contracts.usdt.address);
      await timeTravel(60);
      
      await contracts.usdtPriceFeed.setPrice(ethers.utils.parseEther("1.1"));
      await contracts.oracle.updatePrice(contracts.usdt.address);
      await timeTravel(60);
      
      const twap = await contracts.oracle.getTWAP(contracts.usdt.address, 120);
      expect(twap).to.be.gt(0);
    });

    it("should not allow TWAP window larger than max", async function () {
      await expect(
        contracts.oracle.getTWAP(contracts.usdt.address, 4000)
      ).to.be.revertedWith("PO: Window too large");
    });
  });

  describe("Access Control", function () {
    it("should add authorized updater", async function () {
      await contracts.oracle.addAuthorizedUpdater(accounts.relayer.address);
      expect(await contracts.oracle.authorizedUpdaters(accounts.relayer.address)).to.be.true;
    });

    it("should remove authorized updater", async function () {
      await contracts.oracle.addAuthorizedUpdater(accounts.relayer.address);
      await contracts.oracle.removeAuthorizedUpdater(accounts.relayer.address);
      expect(await contracts.oracle.authorizedUpdaters(accounts.relayer.address)).to.be.false;
    });

    it("should not allow non-owner to add authorized updater", async function () {
      await expect(
        contracts.oracle.connect(accounts.user1).addAuthorizedUpdater(accounts.relayer.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Emergency Functions", function () {
    it("should allow guardian to emergency pause", async function () {
      await contracts.oracle.connect(accounts.guardian).emergencyPause();
      expect(await contracts.oracle.paused()).to.be.true;
    });

    it("should allow owner to emergency unpause", async function () {
      await contracts.oracle.connect(accounts.guardian).emergencyPause();
      await contracts.oracle.emergencyUnpause();
      expect(await contracts.oracle.paused()).to.be.false;
    });

    it("should not allow updates when paused", async function () {
      await contracts.oracle.connect(accounts.guardian).emergencyPause();
      await expect(
        contracts.oracle.updatePrice(contracts.usdt.address)
      ).to.be.revertedWith("Pausable: paused");
    });
  });
});

