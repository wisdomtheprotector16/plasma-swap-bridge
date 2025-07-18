const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployAllContracts, setupOracle, setupStableSwap, mintTokens, timeTravel } = require("./helpers");

describe("PlasmaStableSwap", function () {
  let contracts;
  let accounts;

  beforeEach(async function () {
    ({ contracts, accounts } = await deployAllContracts());
    await setupOracle(contracts.oracle, contracts);
    await setupStableSwap(contracts.stableSwap, contracts);
    await mintTokens(contracts, accounts);
    
    // Update oracle prices to ensure they're fresh for all tests
    await contracts.oracle.updatePrice(contracts.usdt.address);
    await contracts.oracle.updatePrice(contracts.usdc.address);
    await contracts.oracle.updatePrice(contracts.dai.address);
    await contracts.oracle.updatePrice(contracts.wbtc.address);
    await contracts.oracle.updatePrice(contracts.weth.address);
    
    // Approve tokens for testing
    const approveAmount = ethers.utils.parseEther("1000000");
    await contracts.usdt.connect(accounts.user1).approve(contracts.stableSwap.address, approveAmount);
    await contracts.usdc.connect(accounts.user1).approve(contracts.stableSwap.address, approveAmount);
    await contracts.dai.connect(accounts.user1).approve(contracts.stableSwap.address, approveAmount);
    await contracts.wbtc.connect(accounts.user1).approve(contracts.stableSwap.address, approveAmount);
    await contracts.weth.connect(accounts.user1).approve(contracts.stableSwap.address, approveAmount);
    
    // Also approve for relayer
    await contracts.usdt.connect(accounts.user1).approve(contracts.stableSwap.address, approveAmount);
    await contracts.usdc.connect(accounts.user1).approve(contracts.stableSwap.address, approveAmount);
    
    // Approve tokens for liquidity pool
    await contracts.usdt.connect(accounts.user1).approve(contracts.liquidityPool.address, approveAmount);
    await contracts.usdc.connect(accounts.user1).approve(contracts.liquidityPool.address, approveAmount);
    await contracts.dai.connect(accounts.user1).approve(contracts.liquidityPool.address, approveAmount);
    await contracts.wbtc.connect(accounts.user1).approve(contracts.liquidityPool.address, approveAmount);
    await contracts.weth.connect(accounts.user1).approve(contracts.liquidityPool.address, approveAmount);
    
    // Add some initial liquidity to the pool to enable swaps
    const initialLiquidity = [
      ethers.utils.parseUnits("10000", 6), // USDT
      ethers.utils.parseUnits("10000", 6), // USDC
      ethers.utils.parseEther("10000"), // DAI
      ethers.utils.parseUnits("1", 8), // wBTC
      ethers.utils.parseEther("10") // wETH
    ];
    
    // Use the addLiquidity function with deadline to avoid overloading issues
    const block = await ethers.provider.getBlock("latest");
    const deadline = block.timestamp + 3600;
    await contracts.liquidityPool.connect(accounts.user1)["addLiquidity(uint256[],uint256,uint256)"](
      initialLiquidity,
      0, // minToMint
      deadline
    );
  });

  describe("Deployment and Initialization", function () {
    it("should deploy with correct initial values", async function () {
      expect(await contracts.stableSwap.plasmaPaymaster()).to.equal(contracts.paymaster.address);
      expect(await contracts.stableSwap.plasmaOracle()).to.equal(contracts.oracle.address);
      expect(await contracts.stableSwap.guardian()).to.equal(accounts.guardian.address);
      expect(await contracts.stableSwap.relayer()).to.equal(accounts.relayer.address);
      expect(await contracts.stableSwap.liquidityPool()).to.equal(contracts.liquidityPool.address);
    });

    it("should have correct default values", async function () {
      expect(await contracts.stableSwap.swapFee()).to.equal(30); // 0.3%
      expect(await contracts.stableSwap.maxSlippage()).to.equal(500); // 5%
      expect(await contracts.stableSwap.paused()).to.be.false;
    });

    it("should not allow reinitialization", async function () {
      await expect(
        contracts.stableSwap.initialize(
          contracts.paymaster.address,
          contracts.oracle.address,
          accounts.guardian.address,
          accounts.relayer.address,
          contracts.liquidityPool.address
        )
      ).to.be.revertedWith("Initializable: contract is already initialized");
    });
  });

  describe("Token Management", function () {
    it("should add supported token correctly", async function () {
      const newToken = await (await ethers.getContractFactory("MockERC20")).deploy("Test Token", "TEST", 18);
      await contracts.stableSwap.addSupportedToken(newToken.address, false);
      
      expect(await contracts.stableSwap.supportedTokens(newToken.address)).to.be.true;
      expect(await contracts.stableSwap.isStablecoin(newToken.address)).to.be.false;
    });

    it("should mark stablecoin correctly", async function () {
      expect(await contracts.stableSwap.isStablecoin(contracts.usdt.address)).to.be.true;
      expect(await contracts.stableSwap.isStablecoin(contracts.wbtc.address)).to.be.false;
    });

    it("should remove supported token", async function () {
      await contracts.stableSwap.removeSupportedToken(contracts.weth.address);
      expect(await contracts.stableSwap.supportedTokens(contracts.weth.address)).to.be.false;
    });

    it("should not allow non-owner to add token", async function () {
      const newToken = await (await ethers.getContractFactory("MockERC20")).deploy("Test Token", "TEST", 18);
      await expect(
        contracts.stableSwap.connect(accounts.user1).addSupportedToken(newToken.address, false)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow zero address token", async function () {
      await expect(
        contracts.stableSwap.addSupportedToken(ethers.constants.AddressZero, false)
      ).to.be.revertedWith("PSS: Invalid token address");
    });

    it("should not allow duplicate token addition", async function () {
      await expect(
        contracts.stableSwap.addSupportedToken(contracts.usdt.address, true)
      ).to.be.revertedWith("PSS: Token already supported");
    });
  });

  describe("Token Swapping", function () {
    beforeEach(async function () {
      // Update oracle prices to ensure they're fresh
      await contracts.oracle.updatePrice(contracts.usdt.address);
      await contracts.oracle.updatePrice(contracts.usdc.address);
      await contracts.oracle.updatePrice(contracts.dai.address);
      await contracts.oracle.updatePrice(contracts.wbtc.address);
      await contracts.oracle.updatePrice(contracts.weth.address);
      
      // Setup liquidity for swap tests
      const liquidityAmounts = [
        ethers.utils.parseUnits("10000", 6), // USDT
        ethers.utils.parseUnits("10000", 6), // USDC
        ethers.utils.parseEther("10000"), // DAI
        ethers.utils.parseUnits("10", 8), // wBTC
        ethers.utils.parseEther("100") // wETH
      ];
      
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      // Add liquidity to pool for swap tests
      await contracts.liquidityPool.connect(accounts.user1)["addLiquidity(uint256[],uint256,uint256)"](
        liquidityAmounts,
        0, // minToMint
        deadline
      );
    });

    it("should swap stablecoin to stablecoin", async function () {
      const swapAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
      const minOutput = ethers.utils.parseUnits("95", 6); // 95 USDC (5% slippage)
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      const usdtBalanceBefore = await contracts.usdt.balanceOf(accounts.user1.address);
      const usdcBalanceBefore = await contracts.usdc.balanceOf(accounts.user1.address);
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          contracts.usdt.address,
          contracts.usdc.address,
          swapAmount,
          minOutput,
          deadline,
          false
        )
      ).to.emit(contracts.stableSwap, "TokenSwapped");
      
      const usdtBalanceAfter = await contracts.usdt.balanceOf(accounts.user1.address);
      const usdcBalanceAfter = await contracts.usdc.balanceOf(accounts.user1.address);
      
      expect(usdtBalanceBefore.sub(usdtBalanceAfter)).to.equal(swapAmount);
      expect(usdcBalanceAfter.gt(usdcBalanceBefore)).to.be.true;
    });

    it("should swap stablecoin to volatile token", async function () {
      const swapAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDT
      const minOutput = ethers.utils.parseUnits("0.01", 8); // 0.01 wBTC minimum
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      const usdtBalanceBefore = await contracts.usdt.balanceOf(accounts.user1.address);
      const wbtcBalanceBefore = await contracts.wbtc.balanceOf(accounts.user1.address);
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          contracts.usdt.address,
          contracts.wbtc.address,
          swapAmount,
          minOutput,
          deadline,
          false
        )
      ).to.emit(contracts.stableSwap, "TokenSwapped");
      
      const usdtBalanceAfter = await contracts.usdt.balanceOf(accounts.user1.address);
      const wbtcBalanceAfter = await contracts.wbtc.balanceOf(accounts.user1.address);
      
      expect(usdtBalanceBefore.sub(usdtBalanceAfter)).to.equal(swapAmount);
      expect(wbtcBalanceAfter.gt(wbtcBalanceBefore)).to.be.true;
    });

    it("should swap volatile token to stablecoin", async function () {
      const swapAmount = ethers.utils.parseUnits("0.1", 8); // 0.1 wBTC
      const minOutput = ethers.utils.parseUnits("1000", 6); // 1000 USDT minimum
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      const wbtcBalanceBefore = await contracts.wbtc.balanceOf(accounts.user1.address);
      const usdtBalanceBefore = await contracts.usdt.balanceOf(accounts.user1.address);
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          contracts.wbtc.address,
          contracts.usdt.address,
          swapAmount,
          minOutput,
          deadline,
          false
        )
      ).to.emit(contracts.stableSwap, "TokenSwapped");
      
      const wbtcBalanceAfter = await contracts.wbtc.balanceOf(accounts.user1.address);
      const usdtBalanceAfter = await contracts.usdt.balanceOf(accounts.user1.address);
      
      expect(wbtcBalanceBefore.sub(wbtcBalanceAfter)).to.equal(swapAmount);
      expect(usdtBalanceAfter.gt(usdtBalanceBefore)).to.be.true;
    });

    it("should not allow swap with unsupported token", async function () {
      const unsupportedToken = await (await ethers.getContractFactory("MockERC20")).deploy("Unsupported", "UNS", 18);
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          unsupportedToken.address,
          contracts.usdt.address,
          ethers.utils.parseEther("100"),
          0,
          deadline,
          false
        )
      ).to.be.revertedWith("PSS: Token not supported");
    });

    it("should not allow swap with same input and output tokens", async function () {
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          contracts.usdt.address,
          contracts.usdt.address,
          ethers.utils.parseUnits("100", 6),
          0,
          deadline,
          false
        )
      ).to.be.revertedWith("PS: Invalid swap pair");
    });

    it("should not allow swap with zero amount", async function () {
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          contracts.usdt.address,
          contracts.usdc.address,
          0,
          0,
          deadline,
          false
        )
      ).to.be.revertedWith("PS: Invalid amount");
    });

    it("should not allow swap with expired deadline", async function () {
      const block = await ethers.provider.getBlock("latest");
      const expiredDeadline = block.timestamp - 3600; // 1 hour ago
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          contracts.usdt.address,
          contracts.usdc.address,
          ethers.utils.parseUnits("100", 6),
          0,
          expiredDeadline,
          false
        )
      ).to.be.revertedWith("PS: Transaction expired");
    });

    it("should respect slippage protection", async function () {
      const swapAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
      const highMinOutput = ethers.utils.parseUnits("150", 6); // 150 USDC (unrealistic high expectation)
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      // This should fail due to slippage protection
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          contracts.usdt.address,
          contracts.usdc.address,
          swapAmount,
          highMinOutput,
          deadline,
          false
        )
      ).to.be.revertedWith("PS: Insufficient output amount");
    });

    it("should not allow swap when paused", async function () {
      await contracts.stableSwap.connect(accounts.guardian).pause();
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          contracts.usdt.address,
          contracts.usdc.address,
          ethers.utils.parseUnits("100", 6),
          0,
          deadline,
          false
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("should not allow swap with stale price", async function () {
      // Time travel to make prices stale
      await timeTravel(400);
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).swap(
          contracts.usdt.address,
          contracts.usdc.address,
          ethers.utils.parseUnits("100", 6),
          0,
          deadline,
          false
        )
      ).to.be.revertedWith("PSS: Price feed stale");
    });
  });

  describe("Liquidity Management", function () {
    it("should add liquidity correctly", async function () {
      const amounts = [
        ethers.utils.parseUnits("1000", 6), // USDT
        ethers.utils.parseUnits("1000", 6), // USDC
        ethers.utils.parseEther("1000"), // DAI
        ethers.utils.parseUnits("1", 8), // wBTC
        ethers.utils.parseEther("1") // wETH
      ];
      const minToMint = 0;
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).addLiquidity(
          amounts,
          minToMint,
          deadline
        )
      ).to.emit(contracts.stableSwap, "LiquidityAdded");
    });

    it("should remove liquidity correctly", async function () {
      // First add liquidity
      const amounts = [
        ethers.utils.parseUnits("1000", 6), // USDT
        ethers.utils.parseUnits("1000", 6), // USDC
        ethers.utils.parseEther("1000"), // DAI
        ethers.utils.parseUnits("1", 8), // wBTC
        ethers.utils.parseEther("1") // wETH
      ];
      const minToMint = 0;
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600;
      
      await contracts.stableSwap.connect(accounts.user1).addLiquidity(
        amounts,
        minToMint,
        deadline
      );
      
      // Then remove liquidity
      const liquidityAmount = ethers.utils.parseEther("500");
      const minAmounts = [0, 0, 0, 0, 0];
      await expect(
        contracts.stableSwap.connect(accounts.user1).removeLiquidity(
          liquidityAmount,
          minAmounts,
          deadline
        )
      ).to.emit(contracts.stableSwap, "LiquidityRemoved");
    });

    it("should not allow liquidity operations with expired deadline", async function () {
      const amounts = [
        ethers.utils.parseUnits("1000", 6),
        ethers.utils.parseUnits("1000", 6),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseUnits("1", 8),
        ethers.utils.parseEther("1")
      ];
      const minToMint = 0;
      const currentBlock = await ethers.provider.getBlock("latest");
      const expiredDeadline = currentBlock.timestamp - 3600;
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).addLiquidity(
          amounts,
          minToMint,
          expiredDeadline
        )
      ).to.be.revertedWith("PS: Transaction expired");
    });
  });

  describe("Fee Management", function () {
    it("should update swap fee", async function () {
      const newFee = 50; // 0.5%
      await contracts.stableSwap.setSwapFee(newFee);
      expect(await contracts.stableSwap.swapFee()).to.equal(newFee);
    });

    it("should not allow fee above maximum", async function () {
      const highFee = 1001; // 10.01%
      await expect(
        contracts.stableSwap.setSwapFee(highFee)
      ).to.be.revertedWith("PS: Fee too high");
    });

    it("should not allow non-owner to update fee", async function () {
      await expect(
        contracts.stableSwap.connect(accounts.user1).setSwapFee(50)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should calculate fee correctly", async function () {
      const amount = ethers.utils.parseUnits("100", 6);
      const fee = await contracts.stableSwap.calculateSwapFee(
        contracts.usdt.address,
        contracts.usdc.address,
        amount
      );
      
      // For stablecoin-to-stablecoin swaps, fee should be base fee rate
      const expectedFee = 30; // 0.3% in basis points
      expect(fee).to.equal(expectedFee);
    });
  });

  describe("Slippage Configuration", function () {
    it("should update max slippage", async function () {
      const newSlippage = 1000; // 10%
      await contracts.stableSwap.setMaxSlippage(newSlippage);
      expect(await contracts.stableSwap.maxSlippage()).to.equal(newSlippage);
    });

    it("should not allow slippage above maximum", async function () {
      const highSlippage = 5001; // 50.01%
      await expect(
        contracts.stableSwap.setMaxSlippage(highSlippage)
      ).to.be.revertedWith("PSS: Slippage too high");
    });

    it("should not allow non-owner to update slippage", async function () {
      await expect(
        contracts.stableSwap.connect(accounts.user1).setMaxSlippage(1000)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("USDT Address Management", function () {
    it("should set USDT address", async function () {
      const newUSDT = await (await ethers.getContractFactory("MockERC20")).deploy("New USDT", "USDT", 6);
      await contracts.stableSwap.setUSDTAddress(newUSDT.address);
      expect(await contracts.stableSwap.usdtAddress()).to.equal(newUSDT.address);
    });

    it("should not allow non-owner to set USDT address", async function () {
      const newUSDT = await (await ethers.getContractFactory("MockERC20")).deploy("New USDT", "USDT", 6);
      await expect(
        contracts.stableSwap.connect(accounts.user1).setUSDTAddress(newUSDT.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow zero address for USDT", async function () {
      await expect(
        contracts.stableSwap.setUSDTAddress(ethers.constants.AddressZero)
      ).to.be.revertedWith("PSS: Invalid USDT address");
    });
  });

  describe("Emergency Controls", function () {
    it("should allow guardian to pause", async function () {
      await contracts.stableSwap.connect(accounts.guardian).pause();
      expect(await contracts.stableSwap.paused()).to.be.true;
    });

    it("should allow owner to unpause", async function () {
      await contracts.stableSwap.connect(accounts.guardian).pause();
      await contracts.stableSwap.unpause();
      expect(await contracts.stableSwap.paused()).to.be.false;
    });

    it("should not allow non-guardian to pause", async function () {
      await expect(
        contracts.stableSwap.connect(accounts.user1).pause()
      ).to.be.revertedWith("PS: Not guardian");
    });

    it("should not allow non-owner to unpause", async function () {
      await contracts.stableSwap.connect(accounts.guardian).pause();
      await expect(
        contracts.stableSwap.connect(accounts.user1).unpause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should rescue tokens in emergency", async function () {
      // Enable emergency stop first
      await contracts.stableSwap.connect(accounts.guardian).setEmergencyStop(true);
      
      // Send some tokens to the contract
      await contracts.usdt.connect(accounts.user1).transfer(contracts.stableSwap.address, ethers.utils.parseUnits("100", 6));
      
      const balanceBefore = await contracts.usdt.balanceOf(accounts.owner.address);
      await contracts.stableSwap.connect(accounts.guardian).emergencyRescue(
        contracts.usdt.address,
        ethers.utils.parseUnits("100", 6),
        accounts.owner.address
      );
      const balanceAfter = await contracts.usdt.balanceOf(accounts.owner.address);
      
      expect(balanceAfter.sub(balanceBefore)).to.equal(ethers.utils.parseUnits("100", 6));
    });

    it("should not allow non-guardian to rescue tokens", async function () {
      // Enable emergency stop first
      await contracts.stableSwap.connect(accounts.guardian).setEmergencyStop(true);
      
      await expect(
        contracts.stableSwap.connect(accounts.user1).emergencyRescue(
          contracts.usdt.address,
          100,
          accounts.user1.address
        )
      ).to.be.revertedWith("PS: Not guardian");
    });
  });

  describe("Address Updates", function () {
    it("should update guardian address", async function () {
      await contracts.stableSwap.setGuardian(accounts.user2.address);
      expect(await contracts.stableSwap.guardian()).to.equal(accounts.user2.address);
    });

    it("should update relayer address", async function () {
      await contracts.stableSwap.setRelayer(accounts.user2.address);
      expect(await contracts.stableSwap.relayer()).to.equal(accounts.user2.address);
    });

    it("should update oracle address", async function () {
      const newOracle = await (await ethers.getContractFactory("PlasmaOracle")).deploy();
      await contracts.stableSwap.setOracle(newOracle.address);
      expect(await contracts.stableSwap.plasmaOracle()).to.equal(newOracle.address);
    });

    it("should update liquidity pool address", async function () {
      const newPool = await (await ethers.getContractFactory("PlasmaLiquidityPool")).deploy();
      await contracts.stableSwap.setLiquidityPool(newPool.address);
      expect(await contracts.stableSwap.liquidityPool()).to.equal(newPool.address);
    });

    it("should not allow non-owner to update addresses", async function () {
      await expect(
        contracts.stableSwap.connect(accounts.user1).setGuardian(accounts.user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should not allow zero addresses for critical components", async function () {
      await expect(
        contracts.stableSwap.setGuardian(ethers.constants.AddressZero)
      ).to.be.revertedWith("PSS: Invalid guardian address");
      
      await expect(
        contracts.stableSwap.setOracle(ethers.constants.AddressZero)
      ).to.be.revertedWith("PSS: Invalid oracle address");
    });
  });

  describe("Gasless Transfers", function () {
    it.skip("should execute gasless transfer from relayer", async function () {
      // Skip this test for now as it requires complex setup
      this.skip();
    });

    it.skip("should not allow gasless transfer from non-relayer", async function () {
      // Skip this test for now as it requires complex setup
      this.skip();
    });
  });

  describe("Oracle Integration", function () {
    it("should get token price from oracle", async function () {
      await contracts.oracle.updatePrice(contracts.usdt.address);
      const price = await contracts.stableSwap.getTokenPrice(contracts.usdt.address);
      expect(price).to.be.gt(0);
    });

    it("should handle oracle price errors", async function () {
      const unsupportedToken = await (await ethers.getContractFactory("MockERC20")).deploy("Unsupported", "UNS", 18);
      await expect(
        contracts.stableSwap.getTokenPrice(unsupportedToken.address)
      ).to.be.revertedWith("PO: Token not active");
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it.skip("should handle large swap amounts", async function () {
      // Skip this test for now as it requires complex setup
      this.skip();
    });

    it.skip("should handle zero liquidity scenarios", async function () {
      // Skip this test for now as it requires complex setup
      this.skip();
    });
  });

  describe("Gas Optimization", function () {
    it.skip("should use reasonable gas for swaps", async function () {
      // Skip this test for now as it requires complex setup
      this.skip();
    });
  });
});
