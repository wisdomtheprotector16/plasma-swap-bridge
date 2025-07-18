# Plasma Stablecoin Swap & Bridge - Production Ready

A comprehensive DeFi protocol built specifically for Plasma blockchain, featuring advanced stablecoin swapping, cross-chain bridging, and native Bitcoin integration.

## 🚀 Features

### Core Capabilities
- **Native Plasma Integration**: Built specifically for Plasma's stablecoin-first architecture
- **Zero-Fee USD₮ Transfers**: Leverages Plasma's native paymaster system
- **Custom Gas Tokens**: Pay transaction fees using USD₮, wBTC, or other supported tokens
- **Cross-Chain Bridge**: Seamlessly bridge assets between Plasma and other chains
- **Native Bitcoin Bridge**: Direct Bitcoin integration without custodial wrappers
- **Advanced AMM**: StableSwap algorithm optimized for stablecoin trading
- **Millisecond Precision**: Optimized for Plasma's high-performance consensus

### Security Features
- **Multi-layered Security**: Rate limiting, fraud detection, and emergency controls
- **Circuit Breakers**: Automatic protection against extreme market conditions
- **Guardian System**: Multi-signature emergency response capabilities
- **Audit Trail**: Comprehensive transaction logging and monitoring
- **MEV Protection**: Front-running resistance and commit-reveal schemes

## 📋 Prerequisites

- Node.js 18+
- Hardhat or Foundry
- MetaMask or compatible wallet
- Access to Plasma testnet/mainnet

## 🛠 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd plasma-stablecoin-swap
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🔧 Configuration

### Environment Variables

```env
# Network Configuration
PLASMA_TESTNET_RPC_URL=https://testnet.plasma.network
PLASMA_MAINNET_RPC_URL=https://mainnet.plasma.network
PRIVATE_KEY=your_private_key_here

# Contract Addresses (will be populated after deployment)
PLASMA_PAYMASTER_ADDRESS=
PRICE_ORACLE_ADDRESS=
STABLE_SWAP_ADDRESS=
BRIDGE_HANDLER_ADDRESS=
BITCOIN_BRIDGE_ADDRESS=

# Guardian Configuration
GUARDIAN_ADDRESS=0x...
EMERGENCY_MULTISIG_ADDRESS=0x...

# Supported Tokens
USDT_ADDRESS=0x...
USDC_ADDRESS=0x...
DAI_ADDRESS=0x...
WBTC_ADDRESS=0x...
WETH_ADDRESS=0x...
```

## 🚀 Deployment

### 1. Deploy Core Contracts

```bash
# Deploy using Hardhat
npx hardhat run scripts/deploy.js --network plasma-testnet

# Deploy using Foundry
forge script script/Deploy.s.sol --rpc-url $PLASMA_TESTNET_RPC_URL --broadcast
```

### 2. Initialize Contracts

```bash
# Initialize all contracts with proper configuration
npx hardhat run scripts/initialize.js --network plasma-testnet
```

### 3. Configure Supported Tokens

```bash
# Add supported tokens to the swap and bridge
npx hardhat run scripts/configure-tokens.js --network plasma-testnet
```

## 🔗 Contract Addresses

### Plasma Testnet
- **PlasmaStableSwap**: `0x...` (To be deployed)
- **PlasmaBridgeHandler**: `0x...` (To be deployed)
- **PlasmaOracle**: `0x...` (To be deployed)

### Supported Tokens
- **USD₮**: `0x...` (Native USD₮ on Plasma)
- **USDC**: `0x...` 
- **DAI**: `0x...`
- **wBTC**: `0x...`
- **wETH**: `0x...`

## 🔌 Frontend Integration

### React Integration Example

```javascript
import { ethers } from 'ethers';
import { PlasmaStableSwap__factory, PlasmaBridgeHandler__factory } from './typechain';

// Initialize provider
const provider = new ethers.providers.JsonRpcProvider('https://testnet.plasma.network');
const signer = provider.getSigner();

// Initialize contracts
const stableSwap = PlasmaStableSwap__factory.connect(STABLE_SWAP_ADDRESS, signer);
const bridgeHandler = PlasmaBridgeHandler__factory.connect(BRIDGE_HANDLER_ADDRESS, signer);

// Example: Swap tokens
async function swapTokens(fromToken, toToken, amount, minAmountOut) {
  try {
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    
    const tx = await stableSwap.swap(
      fromToken,
      toToken,
      ethers.utils.parseUnits(amount, 18),
      ethers.utils.parseUnits(minAmountOut, 18),
      deadline,
      true // Use gasless transfer for USD₮
    );
    
    await tx.wait();
    console.log('Swap completed:', tx.hash);
  } catch (error) {
    console.error('Swap failed:', error);
  }
}

// Example: Bridge tokens
async function bridgeTokens(token, amount, recipient, destinationChainId) {
  try {
    const tx = await bridgeHandler.bridgeOut(
      token,
      ethers.utils.parseUnits(amount, 18),
      recipient,
      destinationChainId
    );
    
    await tx.wait();
    console.log('Bridge transaction initiated:', tx.hash);
  } catch (error) {
    console.error('Bridge failed:', error);
  }
}
```

### Web3 Integration with MetaMask

```javascript
// Check if user is on Plasma network
async function checkNetwork() {
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  const plasmaChainId = '0x...'; // Plasma chain ID in hex
  
  if (chainId !== plasmaChainId) {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: plasmaChainId }],
    });
  }
}

// Add Plasma network to MetaMask
async function addPlasmaNetwork() {
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: '0x...', // Plasma chain ID
      chainName: 'Plasma Testnet',
      nativeCurrency: {
        name: 'XPL',
        symbol: 'XPL',
        decimals: 18
      },
      rpcUrls: ['https://testnet.plasma.network'],
      blockExplorerUrls: ['https://explorer.testnet.plasma.network']
    }]
  });
}
```

## 📊 API Reference

### PlasmaStableSwap

#### Core Functions

```solidity
function swap(
    address fromToken,
    address toToken,
    uint256 amount,
    uint256 minAmountOut,
    uint256 deadline,
    bool useGaslessTransfer
) external returns (uint256 amountOut);

function addLiquidity(
    uint256[] calldata amounts,
    uint256 minToMint,
    uint256 deadline
) external returns (uint256 mintAmount);

function removeLiquidity(
    uint256 amount,
    uint256[] calldata minAmounts,
    uint256 deadline
) external returns (uint256[] memory amounts);
```

#### View Functions

```solidity
function calculateSwap(
    uint8 fromIndex,
    uint8 toIndex,
    uint256 amount
) external view returns (uint256);

function getTotalPoolValue() external view returns (uint256);

function getSupportedTokens() external view returns (address[] memory);
```

### PlasmaBridgeHandler

#### Core Functions

```solidity
function bridgeOut(
    address token,
    uint256 amount,
    address recipient,
    uint256 destinationChainId
) external;

function gaslessUSDTTransfer(
    address token,
    uint256 amount,
    address recipient,
    uint256 destinationChainId
) external;

function bridgeBitcoin(
    address recipient,
    uint256 destinationChainId,
    bytes32 btcTxHash,
    bool useGaslessTransfer
) external;
```

#### View Functions

```solidity
function estimateBridgeFee(
    address token,
    uint256 amount
) external view returns (uint256 fee, uint256 bridgeAmount);

function getUserDailyVolume(address user) external view returns (uint256);

function getBridgeTransaction(uint256 bridgeId) external view returns (BridgeTransaction memory);
```

## 🔐 Security Considerations

### Rate Limiting
- Daily volume limits per user
- Transaction frequency limits
- Progressive restrictions for high-volume users

### Emergency Controls
- Contract pause functionality
- Guardian-controlled emergency stops
- Multi-signature requirements for critical operations

### Fraud Detection
- Real-time transaction monitoring
- Anomaly detection algorithms
- Automated blacklisting for suspicious activity

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/StableSwap.test.js

# Run with coverage
npx hardhat coverage
```

### Integration Tests
```bash
# Test against Plasma testnet
npx hardhat test --network plasma-testnet

# Test specific scenarios
npx hardhat test test/integration/bridge.test.js
```

## 📈 Monitoring & Analytics

### Key Metrics
- Total Value Locked (TVL)
- Daily trading volume
- Bridge transaction success rate
- Average transaction costs
- User activity metrics

### Health Checks
- Oracle price feed status
- Bridge connectivity
- Liquidity pool balance
- System response times

## 🚨 Emergency Procedures

### Circuit Breaker Activation
1. Detect anomalous activity
2. Automatic contract pause
3. Guardian notification
4. Manual intervention if required

### Recovery Process
1. Investigate root cause
2. Implement fixes if needed
3. Test on staging environment
4. Resume operations with monitoring

## 📞 Support

### Community
- Discord: [Plasma Community](https://discord.gg/plasma)
- Telegram: [Plasma Developers](https://t.me/plasma_devs)
- Twitter: [@PlasmaNetwork](https://twitter.com/PlasmaNetwork)

### Technical Support
- Email: support@plasma.network
- Documentation: https://docs.plasma.network
- GitHub Issues: https://github.com/plasma-network/stablecoin-swap/issues

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

### v1.0.0 (Production Ready)
- Initial production release
- Full Plasma integration
- Advanced security features
- Comprehensive testing suite
- Complete documentation

---

**Built with ❤️ for the Plasma ecosystem**
