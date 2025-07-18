require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

const { PRIVATE_KEY, PLASMA_TESTNET_RPC_URL, PLASMA_MAINNET_RPC_URL } = process.env;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      gas: 12000000,
      blockGasLimit: 0x1fffffffffffff,
      timeout: 1800000,
      forking: {
        url: PLASMA_TESTNET_RPC_URL || "https://testnet.plasma.network",
        enabled: false,
      },
    },
    "plasma-testnet": {
      url: PLASMA_TESTNET_RPC_URL || "https://testnet.plasma.network",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gas: 8000000,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000,
      confirmations: 2,
    },
    "plasma-mainnet": {
      url: PLASMA_MAINNET_RPC_URL || "https://mainnet.plasma.network",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gas: 8000000,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000,
      confirmations: 3,
    },
    // Additional networks for cross-chain testing
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://mainnet.infura.io/v3/YOUR_KEY",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gas: 6000000,
      gasPrice: 20000000000,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gas: 6000000,
      gasPrice: 30000000000,
    },
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gas: 6000000,
      gasPrice: 5000000000,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gas: 6000000,
      gasPrice: 100000000,
    },
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gas: 6000000,
      gasPrice: 1000000,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [":PlasmaStableSwap", ":PlasmaBridgeHandler", ":PlasmaOracle"],
  },
  etherscan: {
    apiKey: {
      // Plasma network explorer API key (when available)
      "plasma-testnet": process.env.PLASMA_EXPLORER_API_KEY || "placeholder",
      "plasma-mainnet": process.env.PLASMA_EXPLORER_API_KEY || "placeholder",
      // Other networks for cross-chain verification
      mainnet: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      optimisticEthereum: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
    },
    customChains: [
      {
        network: "plasma-testnet",
        chainId: 1001, // Replace with actual Plasma testnet chain ID
        urls: {
          apiURL: "https://explorer.testnet.plasma.network/api",
          browserURL: "https://explorer.testnet.plasma.network",
        },
      },
      {
        network: "plasma-mainnet",
        chainId: 1000, // Replace with actual Plasma mainnet chain ID
        urls: {
          apiURL: "https://explorer.plasma.network/api",
          browserURL: "https://explorer.plasma.network",
        },
      },
    ],
  },
  mocha: {
    timeout: 60000,
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
