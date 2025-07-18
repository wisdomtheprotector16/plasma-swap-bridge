# Plasma Swap and Bridge: Troubleshooting and Deployment Guide

## Test Failures Analysis

### Critical Issues Found

#### 1. BridgeHandler Initialization Error
**Error**: `TypeError: Cannot read properties of undefined (reading 'address')`
**Location**: `test/BridgeHandler.test.js:84:69`
**Root Cause**: The `mockOracle` variable in the test is assigned but not properly initialized.
**Fix**: In `BridgeHandler.test.js`, line 20 should use `await` for the oracle deployment:
```javascript
// Wrong
const mockOracle = await PlasmaOracle.deploy();

// Correct
const mockOracle = await upgrades.deployProxy(PlasmaOracle, [guardian.address], {
  initializer: "initialize",
});
```

#### 2. Token Not Active Error
**Error**: `PO: Token not active`
**Root Cause**: Tokens are not properly registered in the PlasmaOracle before bridge operations.
**Fix**: The BridgeHandler test setup needs to add tokens to the oracle:
```javascript
// Add this to BridgeHandler.test.js beforeEach
await mockOracle.addToken(usdt.address, 2, 100, 300, true);
await mockOracle.addToken(usdc.address, 2, 100, 300, true);
await mockOracle.addToken(dai.address, 2, 150, 300, true);
await mockOracle.addToken(wbtc.address, 3, 500, 600, false);
await mockOracle.addToken(weth.address, 3, 500, 600, false);
```

#### 3. Insufficient Liquidity Error
**Error**: `PS: Insufficient liquidity`
**Root Cause**: Liquidity pool setup in StableSwap tests is incomplete.
**Fix**: The liquidity pool needs proper initialization and funding:
```javascript
// Ensure liquidity pool is properly connected to stable swap
await contracts.stableSwap.setLiquidityPool(contracts.liquidityPool.address);

// Add sufficient liquidity before swaps
const liquidityAmounts = [
  ethers.utils.parseUnits("100000", 6), // USDT
  ethers.utils.parseUnits("100000", 6), // USDC
  ethers.utils.parseEther("100000"),   // DAI
  ethers.utils.parseUnits("10", 8),    // wBTC
  ethers.utils.parseEther("100")       // wETH
];
```

#### 4. Slippage Configuration Issues
**Error**: `PS: Slippage exceeded`
**Root Cause**: Slippage tolerance is too restrictive for test scenarios.
**Fix**: Adjust slippage parameters in tests:
```javascript
// Increase minimum output amounts to account for slippage
const minOutput = ethers.utils.parseUnits("90", 6); // 10% slippage tolerance
```

### How to Avoid These Issues

1. **Proper Test Setup**:
   - Always use `await` for async contract deployments
   - Ensure all dependencies are properly initialized
   - Set up oracle with tokens before testing bridge operations

2. **Oracle Configuration**:
   - Add all tokens to oracle with correct parameters
   - Ensure price feeds are properly configured
   - Update prices before operations that depend on them

3. **Liquidity Management**:
   - Initialize liquidity pools with adequate amounts
   - Test with realistic liquidity scenarios
   - Account for pool fees and slippage in calculations

4. **Contract Interactions**:
   - Always check contract state before operations
   - Use proper error handling in production code
   - Test edge cases with appropriate parameters

## Comprehensive Deployment Guide for Beginners

### Prerequisites

1. **Node.js and npm**: Install Node.js v18.0.0 or higher
2. **Git**: For version control
3. **Hardhat**: Smart contract development framework
4. **Wallet Setup**: Have a wallet with testnet tokens

### Step 1: Environment Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-repo/plasma-swap-bridge.git
   cd plasma-swap-bridge
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```
   PRIVATE_KEY=your_private_key_here
   PLASMA_TESTNET_RPC_URL=https://testnet.plasma.network
   PLASMA_MAINNET_RPC_URL=https://mainnet.plasma.network
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

### Step 2: Compilation and Testing

1. **Compile Contracts**:
   ```bash
   npx hardhat compile
   ```

2. **Run Tests** (with fixes applied):
   ```bash
   npx hardhat test
   ```

3. **Check Contract Sizes**:
   ```bash
   npx hardhat size-contracts
   ```

### Step 3: Deployment Process

#### Local Development

1. **Start Local Node**:
   ```bash
   npx hardhat node
   ```

2. **Deploy to Local Network**:
   ```bash
   npx hardhat run deploy.js --network localhost
   ```

#### Testnet Deployment

1. **Deploy to Testnet**:
   ```bash
   npx hardhat run deploy.js --network plasma-testnet
   ```

2. **Verify Deployment**:
   ```bash
   npx hardhat run scripts/verify.js --network plasma-testnet
   ```

#### Mainnet Deployment

1. **Final Testing**:
   ```bash
   npx hardhat test --network plasma-testnet
   ```

2. **Deploy to Mainnet**:
   ```bash
   npx hardhat run deploy.js --network plasma-mainnet
   ```

3. **Verify Contracts**:
   ```bash
   npx hardhat run scripts/verify.js --network plasma-mainnet
   ```

### Step 4: Post-Deployment Configuration

1. **Initialize Contracts**:
   ```bash
   npx hardhat run scripts/initialize.js --network plasma-mainnet
   ```

2. **Set Up Oracle Price Feeds**:
   ```bash
   npx hardhat run scripts/setup-oracle.js --network plasma-mainnet
   ```

3. **Configure Liquidity Pools**:
   ```bash
   npx hardhat run scripts/setup-liquidity.js --network plasma-mainnet
   ```

### Step 5: Monitoring and Maintenance

1. **Monitor Contract Performance**:
   - Use block explorers to track transactions
   - Monitor gas usage and optimization opportunities
   - Set up alerts for critical events

2. **Regular Updates**:
   - Update oracle prices regularly
   - Monitor liquidity levels
   - Check for security updates

### Common Deployment Issues and Solutions

1. **Gas Limit Exceeded**:
   - Increase gas limit in network configuration
   - Use `viaIR: true` in Solidity settings
   - Consider breaking large contracts into smaller ones

2. **Nonce Issues**:
   - Reset nonce in wallet
   - Use different accounts for concurrent deployments

3. **Network Connectivity**:
   - Check RPC endpoint status
   - Use multiple RPC endpoints as fallback
   - Increase timeout settings

### Security Considerations

1. **Private Key Management**:
   - Never commit private keys to version control
   - Use hardware wallets for mainnet deployments
   - Implement multi-signature wallets for critical operations

2. **Contract Verification**:
   - Always verify contracts on block explorers
   - Double-check deployment parameters
   - Conduct security audits before mainnet

3. **Access Control**:
   - Implement proper role-based access control
   - Use timelocks for critical operations
   - Monitor admin operations

### Gas Optimization Tips

1. **Compiler Settings**:
   - Use optimizer with appropriate runs
   - Enable `viaIR` for better optimization
   - Use latest Solidity version

2. **Contract Design**:
   - Pack structs efficiently
   - Use `uint256` for gas efficiency
   - Minimize external calls

3. **Deployment Strategy**:
   - Deploy during low gas periods
   - Use gas price optimization tools
   - Consider proxy patterns for upgrades


