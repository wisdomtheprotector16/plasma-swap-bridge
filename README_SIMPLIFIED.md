# TrueFlow - Plasma Swap & Bridge (Simplified)

A production-ready stablecoin swap and bridge protocol optimized for Plasma blockchain without staking or liquidity pool functionality.

## Overview

This simplified version of TrueFlow focuses exclusively on:
- **Token Swapping**: Price-based token swaps using oracle feeds
- **Cross-chain Bridging**: Secure asset bridging across multiple chains
- **Plasma Chain Compatibility**: Native integration with Plasma's paymaster system

## Key Features

### Swap Functionality
- ✅ Multi-asset token swaps (USDT, USDC, DAI, wBTC, wETH)
- ✅ Oracle-based pricing mechanism
- ✅ Dynamic fee structure
- ✅ Advanced slippage protection
- ✅ Rate limiting and security controls
- ✅ Emergency circuit breakers
- ✅ Gasless USD₮ transfers via Plasma paymaster

### Bridge Functionality
- ✅ Cross-chain asset bridging
- ✅ Native Bitcoin bridge integration
- ✅ Multi-chain support (Ethereum, BSC, Polygon, Arbitrum, Optimism)
- ✅ Fraud detection and prevention
- ✅ Daily volume limits
- ✅ Emergency pause mechanisms

### Removed Features
- ❌ Staking functionality
- ❌ Liquidity pool management
- ❌ LP token minting/burning
- ❌ Yield farming
- ❌ Governance token rewards

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PlasmaOracle  │    │ PlasmaStableSwap│    │PlasmaBridgeHandler│
│                 │    │                 │    │                 │
│ - Price feeds   │◄───┤ - Token swaps   │    │ - Cross-chain   │
│ - Stale checks  │    │ - Fee management│    │   bridging      │
│ - Multi-source  │    │ - Rate limiting │    │ - Bitcoin bridge│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ PlasmaPaymaster │
                    │                 │
                    │ - Gasless txs   │
                    │ - Gas tokens    │
                    └─────────────────┘
```

## Smart Contracts

### PlasmaStableSwap.sol
The core swap contract that handles token exchanges using oracle-based pricing.

**Key Functions:**
- `swap()` - Execute token swaps with slippage protection
- `calculateSwap()` - Calculate swap output amounts
- `seedLiquidity()` - Admin function to seed initial token reserves
- `addSupportedToken()` - Add new supported tokens
- `setSwapFee()` - Update swap fees

### PlasmaBridgeHandler.sol
Handles cross-chain asset bridging with advanced security features.

**Key Functions:**
- `bridgeOut()` - Bridge tokens to another chain
- `bridgeIn()` - Receive tokens from another chain
- `bridgeBitcoin()` - Bridge Bitcoin using native bridge
- `gaslessUSDTTransfer()` - Execute gasless USDT transfers

### PlasmaOracle.sol
Provides reliable price feeds for supported tokens.

**Key Functions:**
- `getPrice()` - Get current token price
- `isStale()` - Check if price feed is stale
- `addToken()` - Add new token to oracle

## Deployment

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Compile contracts:**
```bash
npx hardhat compile
```

4. **Run tests:**
```bash
npx hardhat test test/SwapOnly.test.js
```

5. **Deploy to testnet:**
```bash
npx hardhat run deploy.js --network plasma-testnet
```

## Configuration

### Environment Variables
```bash
PRIVATE_KEY=your_private_key
GUARDIAN_ADDRESS=guardian_wallet_address
RELAYER_ADDRESS=relayer_wallet_address
PLASMA_PAYMASTER_ADDRESS=paymaster_contract_address
PLASMA_BRIDGE_ADDRESS=bridge_contract_address
```

### Supported Tokens
- USDT (6 decimals)
- USDC (6 decimals) 
- DAI (18 decimals)
- wBTC (8 decimals)
- wETH (18 decimals)

### Supported Chains
- Ethereum (Chain ID: 1)
- BSC (Chain ID: 56)
- Polygon (Chain ID: 137)
- Arbitrum (Chain ID: 42161)
- Optimism (Chain ID: 10)

## Usage Examples

### Token Swap
```javascript
const swapAmount = ethers.utils.parseUnits("100", 6); // 100 USDT
const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

await stableSwap.swap(
    usdtAddress,
    usdcAddress,
    swapAmount,
    0, // minAmountOut
    deadline,
    false // useGaslessTransfer
);
```

### Cross-chain Bridge
```javascript
const bridgeAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDT
const destinationChain = 137; // Polygon

await bridgeHandler.bridgeOut(
    usdtAddress,
    bridgeAmount,
    recipientAddress,
    destinationChain
);
```

## Security Features

- **Rate Limiting**: Prevents spam and abuse
- **Daily Volume Caps**: Configurable per-user limits
- **Emergency Stops**: Guardian can pause operations
- **Slippage Protection**: User-defined maximum slippage
- **Oracle Staleness Checks**: Ensures fresh price data
- **Multi-signature Support**: Critical operations require multiple signatures

## Gas Optimization

- **Plasma Paymaster Integration**: Gasless USDT transfers
- **Efficient Storage**: Minimal state variables
- **Batch Operations**: Multiple swaps in single transaction
- **Optimized Calculations**: Gas-efficient price calculations

## Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/SwapOnly.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

## Production Considerations

1. **Oracle Security**: Ensure price feeds are reliable and tamper-proof
2. **Access Controls**: Properly configure guardian and admin roles
3. **Fee Management**: Set appropriate swap and bridge fees
4. **Volume Limits**: Configure reasonable daily volume caps
5. **Emergency Procedures**: Establish clear emergency response protocols

## License

MIT License - see LICENSE file for details.

## Contact

For questions or support, please contact the development team.
