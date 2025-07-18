# PlasmaStableSwap Developer Guide

## Overview
PlasmaStableSwap is a comprehensive DeFi protocol that enables efficient token swapping with integrated liquidity management, oracle price feeds, and gasless transactions on the Plasma blockchain.

## Architecture

### Core Components
- **PlasmaStableSwap**: Main swap contract handling token exchanges
- **PlasmaOracle**: Price feed oracle with stale price protection
- **PlasmaLiquidityPool**: Liquidity management for optimal swap execution
- **PlasmaPaymaster**: Gasless transaction handling
- **BridgeHandler**: Cross-chain bridging functionality

### Key Features
- Low-slippage token swapping
- Dynamic fee calculation
- Stablecoin-to-stablecoin optimization
- Gasless transaction support
- Emergency pause/unpause functionality
- Oracle-based price validation
- Liquidity pool integration

## Setup and Environment Configuration

### Prerequisites
```bash
# Install dependencies
npm install

# Install Hardhat globally (optional)
npm install -g hardhat
```

### Environment Configuration
Create a `.env` file in the root directory:

```bash
# Network Configuration
PRIVATE_KEY=your_private_key_here
INFURA_PROJECT_ID=your_infura_project_id
ALCHEMY_API_KEY=your_alchemy_api_key

# Plasma Network
PLASMA_RPC_URL=https://plasma-rpc.example.com
PLASMA_CHAIN_ID=12345

# Contract Addresses (leave empty for fresh deployments)
ORACLE_ADDRESS=
STABLE_SWAP_ADDRESS=
BRIDGE_HANDLER_ADDRESS=
LIQUIDITY_POOL_ADDRESS=
PAYMASTER_ADDRESS=

# Oracle Configuration
PRICE_FEED_STALENESS_THRESHOLD=300
ORACLE_UPDATE_INTERVAL=60

# Fee Configuration
DEFAULT_SWAP_FEE=30
MAX_SWAP_FEE=1000
DEFAULT_SLIPPAGE_PROTECTION=500

# Security
GUARDIAN_ADDRESS=0x1234567890123456789012345678901234567890
RELAYER_ADDRESS=0x1234567890123456789012345678901234567890

# Token Addresses (testnet examples)
USDT_ADDRESS=0x1234567890123456789012345678901234567890
USDC_ADDRESS=0x1234567890123456789012345678901234567890
DAI_ADDRESS=0x1234567890123456789012345678901234567890
WBTC_ADDRESS=0x1234567890123456789012345678901234567890
WETH_ADDRESS=0x1234567890123456789012345678901234567890
```

### Hardhat Configuration
The `hardhat.config.js` is already configured for multiple networks:

```javascript
// Networks supported:
// - hardhat (local)
// - localhost
// - sepolia
// - mainnet
// - polygon
// - arbitrum
// - plasma (custom)
```

## Deployment Guide

### 1. Local Development Deployment

```bash
# Start local Hardhat node
npx hardhat node

# Deploy all contracts to local network
npx hardhat run scripts/deploy.js --network localhost
```

### 2. Testnet Deployment

```bash
# Deploy to Sepolia
npx hardhat run scripts/deploy.js --network sepolia

# Deploy to Polygon Mumbai
npx hardhat run scripts/deploy.js --network polygon

# Deploy to Arbitrum Goerli
npx hardhat run scripts/deploy.js --network arbitrum
```

### 3. Plasma Network Deployment

```bash
# Deploy to Plasma network
npx hardhat run scripts/deploy.js --network plasma
```

### 4. Production Deployment

```bash
# Deploy to mainnet (requires mainnet configuration)
npx hardhat run scripts/deploy.js --network mainnet
```

## Contract Interaction Examples

### 1. Basic Token Swap

```javascript
const { ethers } = require("hardhat");

async function performSwap() {
  const stableSwap = await ethers.getContractAt("PlasmaStableSwap", STABLE_SWAP_ADDRESS);
  
  // Swap parameters
  const fromToken = "0x..."; // USDT address
  const toToken = "0x...";   // USDC address
  const amount = ethers.utils.parseUnits("100", 6); // 100 USDT (6 decimals)
  const minAmountOut = ethers.utils.parseUnits("99", 6); // 99 USDC minimum
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const useGaslessTransfer = false;
  
  // Perform swap
  const tx = await stableSwap.swap(
    fromToken,
    toToken,
    amount,
    minAmountOut,
    deadline,
    useGaslessTransfer
  );
  
  await tx.wait();
  console.log("Swap completed:", tx.hash);
}
```

### 2. Adding Liquidity

```javascript
async function addLiquidity() {
  const stableSwap = await ethers.getContractAt("PlasmaStableSwap", STABLE_SWAP_ADDRESS);
  
  // Get supported tokens
  const supportedTokens = await stableSwap.getSupportedTokens();
  
  // Prepare amounts array (must match supported tokens length)
  const amounts = [
    ethers.utils.parseUnits("1000", 6), // USDT
    ethers.utils.parseUnits("1000", 6), // USDC
    ethers.utils.parseEther("1000"),    // DAI
    0, // WBTC (not adding)
    0  // WETH (not adding)
  ];
  
  const minAmounts = [0, 0, 0, 0, 0]; // Accept any amount
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  
  const tx = await stableSwap.addLiquidity(amounts, minAmounts, deadline);
  await tx.wait();
  console.log("Liquidity added:", tx.hash);
}
```

### 3. Removing Liquidity

```javascript
async function removeLiquidity() {
  const stableSwap = await ethers.getContractAt("PlasmaStableSwap", STABLE_SWAP_ADDRESS);
  
  // Get user's liquidity balance
  const liquidityBalance = await stableSwap.getUserLiquidityBalance(userAddress);
  
  // Remove half of liquidity
  const liquidityToRemove = liquidityBalance.div(2);
  
  const minAmounts = [0, 0, 0, 0, 0]; // Accept any amount
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  
  const tx = await stableSwap.removeLiquidity(liquidityToRemove, minAmounts, deadline);
  await tx.wait();
  console.log("Liquidity removed:", tx.hash);
}
```

### 4. Gasless Transaction

```javascript
async function performGaslessSwap() {
  const stableSwap = await ethers.getContractAt("PlasmaStableSwap", STABLE_SWAP_ADDRESS);
  
  // Must be called by authorized relayer
  const relayerSigner = await ethers.getSigner(RELAYER_ADDRESS);
  const stableSwapAsRelayer = stableSwap.connect(relayerSigner);
  
  const tx = await stableSwapAsRelayer.swap(
    fromToken,
    toToken,
    amount,
    minAmountOut,
    deadline,
    true // useGaslessTransfer = true
  );
  
  await tx.wait();
  console.log("Gasless swap completed:", tx.hash);
}
```

## Oracle Integration

### 1. Updating Token Prices

```javascript
async function updateOraclePrices() {
  const oracle = await ethers.getContractAt("PlasmaOracle", ORACLE_ADDRESS);
  
  // Update individual token price
  await oracle.updatePrice(USDT_ADDRESS);
  await oracle.updatePrice(USDC_ADDRESS);
  
  // Batch update multiple tokens
  const tokens = [USDT_ADDRESS, USDC_ADDRESS, DAI_ADDRESS];
  await oracle.batchUpdatePrices(tokens);
}
```

### 2. Checking Price Staleness

```javascript
async function checkPriceStaleness() {
  const oracle = await ethers.getContractAt("PlasmaOracle", ORACLE_ADDRESS);
  
  const priceData = await oracle.getPrice(USDT_ADDRESS);
  const currentTime = Math.floor(Date.now() / 1000);
  const staleness = currentTime - priceData.timestamp;
  
  console.log(`Price staleness: ${staleness} seconds`);
  console.log(`Is stale: ${staleness > 300}`); // 5 minutes threshold
}
```

## Administrative Functions

### 1. Fee Management

```javascript
async function updateFees() {
  const stableSwap = await ethers.getContractAt("PlasmaStableSwap", STABLE_SWAP_ADDRESS);
  
  // Update swap fee (30 = 0.3%)
  await stableSwap.setSwapFee(30);
  
  // Update slippage protection (500 = 5%)
  await stableSwap.setMaxSlippage(500);
}
```

### 2. Token Management

```javascript
async function manageTokens() {
  const stableSwap = await ethers.getContractAt("PlasmaStableSwap", STABLE_SWAP_ADDRESS);
  
  // Add new supported token
  const newTokenAddress = "0x...";
  const isStablecoin = true;
  await stableSwap.addSupportedToken(newTokenAddress, isStablecoin);
  
  // Remove token
  await stableSwap.removeSupportedToken(newTokenAddress);
}
```

### 3. Emergency Controls

```javascript
async function emergencyOperations() {
  const stableSwap = await ethers.getContractAt("PlasmaStableSwap", STABLE_SWAP_ADDRESS);
  
  // Pause contract (guardian only)
  const guardianSigner = await ethers.getSigner(GUARDIAN_ADDRESS);
  await stableSwap.connect(guardianSigner).pause();
  
  // Unpause contract (owner only)
  await stableSwap.unpause();
  
  // Emergency token rescue (owner only)
  await stableSwap.emergencyRescue(
    tokenAddress,
    rescueToAddress,
    amount
  );
}
```

## Testing

### Running Tests

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/PlasmaStableSwap.test.js

# Run tests with gas reporting
npx hardhat test --gas-report

# Run tests with coverage
npx hardhat coverage
```

### Test Categories

1. **Deployment and Initialization**: Contract setup and configuration
2. **Token Management**: Adding/removing supported tokens
3. **Token Swapping**: Core swap functionality with various scenarios
4. **Liquidity Management**: Adding/removing liquidity
5. **Fee Management**: Fee calculation and updates
6. **Slippage Protection**: Slippage configuration and enforcement
7. **Emergency Controls**: Pause/unpause and emergency functions
8. **Oracle Integration**: Price feed validation and staleness checks
9. **Gasless Transfers**: Relayer-based gasless transactions
10. **Edge Cases**: Error handling and boundary conditions

## Error Handling

### Common Errors and Solutions

1. **"PSS: Token not supported"**
   - Ensure token is added via `addSupportedToken()`
   - Check token address is correct

2. **"PSS: Deadline expired"**
   - Increase deadline parameter
   - Ensure system time is correct

3. **"PSS: Slippage exceeded"**
   - Increase `minAmountOut` parameter
   - Check market conditions

4. **"Price feed stale"**
   - Update oracle prices before swapping
   - Check oracle configuration

5. **"Pausable: paused"**
   - Contract is in emergency pause state
   - Contact administrator to unpause

## Security Considerations

### Access Control
- **Owner**: Can update fees, add/remove tokens, manage addresses
- **Guardian**: Can pause contract in emergencies
- **Relayer**: Can execute gasless transactions

### Best Practices
1. Always use deadline parameters for time-sensitive operations
2. Implement proper slippage protection
3. Monitor oracle price staleness
4. Use multi-signature wallets for admin functions
5. Regular security audits of contract code

## Monitoring and Analytics

### Key Metrics to Track
- Total swap volume
- Swap fees collected
- Liquidity pool balance
- Price deviation from oracle
- Gas usage optimization
- Failed transaction rates

### Event Monitoring
```javascript
// Listen for swap events
stableSwap.on("TokenSwapped", (user, fromToken, toToken, amountIn, amountOut, fee, timestamp) => {
  console.log("Swap executed:", {
    user,
    fromToken,
    toToken,
    amountIn: ethers.utils.formatUnits(amountIn, 6),
    amountOut: ethers.utils.formatUnits(amountOut, 6),
    fee: ethers.utils.formatUnits(fee, 6)
  });
});
```

## Frontend Integration

### Web3 Integration Example
```javascript
// Initialize contract connection
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const stableSwap = new ethers.Contract(STABLE_SWAP_ADDRESS, abi, signer);

// Connect wallet
await window.ethereum.request({ method: 'eth_requestAccounts' });

// Execute swap with user confirmation
const tx = await stableSwap.swap(fromToken, toToken, amount, minAmountOut, deadline, false);
await tx.wait();
```

## Troubleshooting

### Debug Mode
```bash
# Enable debug logging
DEBUG=hardhat:* npx hardhat test

# Detailed transaction tracing
npx hardhat run scripts/debug.js --network localhost
```

### Common Issues
1. **Gas estimation failures**: Check token approvals
2. **Revert without reason**: Enable debug mode
3. **Price feed issues**: Verify oracle configuration
4. **Liquidity errors**: Check pool balance and configuration

## Support and Resources

- **Documentation**: `/docs` folder
- **Tests**: `/test` folder for usage examples
- **Scripts**: `/scripts` folder for deployment and utilities
- **Contracts**: `/contracts` folder for source code

For additional support, refer to the README.md file or contact the development team.
