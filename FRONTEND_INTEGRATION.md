# Frontend Integration Guide

Complete guide for integrating Plasma Stablecoin Swap & Bridge with your frontend application.

## 🎯 Overview

This guide provides comprehensive examples for integrating with the Plasma Stablecoin Swap & Bridge protocol using React, TypeScript, and modern Web3 libraries.

## 📋 Prerequisites

```bash
npm install ethers @types/ethers
npm install @web3-react/core @web3-react/injected-connector
npm install @reduxjs/toolkit react-redux  # Optional for state management
```

## 🔧 Setup

### 1. Network Configuration

```typescript
// src/config/networks.ts
export const PLASMA_TESTNET = {
  chainId: '0x3E9', // 1001 in hex
  chainName: 'Plasma Testnet',
  nativeCurrency: {
    name: 'XPL',
    symbol: 'XPL',
    decimals: 18
  },
  rpcUrls: ['https://testnet.plasma.network'],
  blockExplorerUrls: ['https://explorer.testnet.plasma.network']
};

export const PLASMA_MAINNET = {
  chainId: '0x3E8', // 1000 in hex
  chainName: 'Plasma Mainnet',
  nativeCurrency: {
    name: 'XPL',
    symbol: 'XPL',
    decimals: 18
  },
  rpcUrls: ['https://mainnet.plasma.network'],
  blockExplorerUrls: ['https://explorer.plasma.network']
};
```

### 2. Contract Addresses

```typescript
// src/config/contracts.ts
export const CONTRACT_ADDRESSES = {
  PLASMA_TESTNET: {
    STABLE_SWAP: '0x...', // Deployed contract address
    BRIDGE_HANDLER: '0x...', // Deployed contract address
    PRICE_ORACLE: '0x...', // Deployed contract address
    PLASMA_PAYMASTER: '0x...', // Plasma's native paymaster
  },
  PLASMA_MAINNET: {
    STABLE_SWAP: '0x...',
    BRIDGE_HANDLER: '0x...',
    PRICE_ORACLE: '0x...',
    PLASMA_PAYMASTER: '0x...',
  }
};

export const TOKEN_ADDRESSES = {
  PLASMA_TESTNET: {
    USDT: '0x...',
    USDC: '0x...',
    DAI: '0x...',
    WBTC: '0x...',
    WETH: '0x...',
  },
  PLASMA_MAINNET: {
    USDT: '0x...',
    USDC: '0x...',
    DAI: '0x...',
    WBTC: '0x...',
    WETH: '0x...',
  }
};
```

### 3. ABIs and TypeScript Types

```typescript
// src/types/contracts.ts
export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  minAmountOut: string;
  deadline: number;
  useGaslessTransfer: boolean;
}

export interface BridgeParams {
  token: string;
  amount: string;
  recipient: string;
  destinationChainId: number;
}

export interface LiquidityParams {
  amounts: string[];
  minToMint: string;
  deadline: number;
}

export interface PriceData {
  price: string;
  confidence: number;
  timestamp: number;
  isValid: boolean;
}

export interface BridgeTransaction {
  user: string;
  token: string;
  amount: string;
  recipient: string;
  sourceChainId: number;
  destinationChainId: number;
  timestamp: number;
  status: BridgeStatus;
  confirmations: number;
  txHash: string;
  useGaslessTransfer: boolean;
}

export enum BridgeStatus {
  Pending = 0,
  Confirmed = 1,
  Completed = 2,
  Failed = 3,
  Cancelled = 4
}
```

## 🔗 Web3 Connection

### 1. Wallet Connection Hook

```typescript
// src/hooks/useWallet.ts
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { useCallback, useEffect, useState } from 'react';
import { PLASMA_TESTNET, PLASMA_MAINNET } from '../config/networks';

const injectedConnector = new InjectedConnector({
  supportedChainIds: [1001, 1000] // Plasma testnet and mainnet
});

export const useWallet = () => {
  const { activate, account, library, chainId, deactivate } = useWeb3React();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      await activate(injectedConnector);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [activate]);

  const disconnect = useCallback(() => {
    deactivate();
  }, [deactivate]);

  const switchToPlasmaTestnet = useCallback(async () => {
    if (!library?.provider?.request) return;

    try {
      await library.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: PLASMA_TESTNET.chainId }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await library.provider.request({
            method: 'wallet_addEthereumChain',
            params: [PLASMA_TESTNET],
          });
        } catch (addError) {
          console.error('Failed to add Plasma network:', addError);
        }
      }
    }
  }, [library]);

  const isPlasmaNetwork = chainId === 1001 || chainId === 1000;

  return {
    connect,
    disconnect,
    switchToPlasmaTestnet,
    account,
    chainId,
    isConnecting,
    isPlasmaNetwork,
    library
  };
};
```

### 2. Contract Interaction Hook

```typescript
// src/hooks/useContracts.ts
import { ethers } from 'ethers';
import { useWeb3React } from '@web3-react/core';
import { useMemo } from 'react';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { STABLE_SWAP_ABI, BRIDGE_HANDLER_ABI, PRICE_ORACLE_ABI } from '../config/abis';

export const useContracts = () => {
  const { library, chainId } = useWeb3React();

  return useMemo(() => {
    if (!library || !chainId) return null;

    const isTestnet = chainId === 1001;
    const addresses = isTestnet ? CONTRACT_ADDRESSES.PLASMA_TESTNET : CONTRACT_ADDRESSES.PLASMA_MAINNET;

    const stableSwap = new ethers.Contract(
      addresses.STABLE_SWAP,
      STABLE_SWAP_ABI,
      library.getSigner()
    );

    const bridgeHandler = new ethers.Contract(
      addresses.BRIDGE_HANDLER,
      BRIDGE_HANDLER_ABI,
      library.getSigner()
    );

    const priceOracle = new ethers.Contract(
      addresses.PRICE_ORACLE,
      PRICE_ORACLE_ABI,
      library.getSigner()
    );

    return {
      stableSwap,
      bridgeHandler,
      priceOracle
    };
  }, [library, chainId]);
};
```

## 💱 Swap Implementation

### 1. Swap Hook

```typescript
// src/hooks/useSwap.ts
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContracts } from './useContracts';
import { SwapParams } from '../types/contracts';

export const useSwap = () => {
  const contracts = useContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeSwap = useCallback(async (params: SwapParams) => {
    if (!contracts) throw new Error('Contracts not initialized');

    setLoading(true);
    setError(null);

    try {
      // 1. Check allowance
      const tokenContract = new ethers.Contract(
        params.fromToken,
        ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'],
        contracts.stableSwap.signer
      );

      const allowance = await tokenContract.allowance(
        await contracts.stableSwap.signer.getAddress(),
        contracts.stableSwap.address
      );

      // 2. Approve if needed
      if (allowance.lt(params.amount)) {
        const approveTx = await tokenContract.approve(
          contracts.stableSwap.address,
          ethers.constants.MaxUint256
        );
        await approveTx.wait();
      }

      // 3. Execute swap
      const tx = await contracts.stableSwap.swap(
        params.fromToken,
        params.toToken,
        params.amount,
        params.minAmountOut,
        params.deadline,
        params.useGaslessTransfer
      );

      const receipt = await tx.wait();
      
      // 4. Parse swap event
      const swapEvent = receipt.events?.find(
        (e: any) => e.event === 'TokenSwapped'
      );

      return {
        success: true,
        txHash: receipt.transactionHash,
        amountOut: swapEvent?.args?.amountOut?.toString(),
        fee: swapEvent?.args?.fee?.toString()
      };

    } catch (err: any) {
      setError(err.message || 'Swap failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  const getSwapQuote = useCallback(async (
    fromToken: string,
    toToken: string,
    amount: string
  ) => {
    if (!contracts) return null;

    try {
      const fromIndex = await contracts.stableSwap.tokenIndex(fromToken);
      const toIndex = await contracts.stableSwap.tokenIndex(toToken);
      
      const quote = await contracts.stableSwap.calculateSwap(
        fromIndex,
        toIndex,
        amount
      );

      const dynamicFee = await contracts.stableSwap.calculateDynamicFee(
        fromToken,
        toToken,
        amount
      );

      return {
        amountOut: quote.toString(),
        fee: dynamicFee.toString(),
        priceImpact: '0.01' // Calculate based on your needs
      };
    } catch (err) {
      console.error('Failed to get quote:', err);
      return null;
    }
  }, [contracts]);

  return {
    executeSwap,
    getSwapQuote,
    loading,
    error
  };
};
```

### 2. Swap Component

```typescript
// src/components/SwapInterface.tsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useSwap } from '../hooks/useSwap';
import { useWallet } from '../hooks/useWallet';
import { TOKEN_ADDRESSES } from '../config/contracts';

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  logo: string;
}

export const SwapInterface: React.FC = () => {
  const { account, chainId, isPlasmaNetwork } = useWallet();
  const { executeSwap, getSwapQuote, loading, error } = useSwap();
  
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [slippage, setSlippage] = useState('0.5');
  const [useGasless, setUseGasless] = useState(false);
  const [quote, setQuote] = useState(null);

  const tokens: Token[] = [
    {
      address: TOKEN_ADDRESSES.PLASMA_TESTNET.USDT,
      symbol: 'USDT',
      decimals: 6,
      logo: '/tokens/usdt.png'
    },
    {
      address: TOKEN_ADDRESSES.PLASMA_TESTNET.USDC,
      symbol: 'USDC',
      decimals: 6,
      logo: '/tokens/usdc.png'
    },
    {
      address: TOKEN_ADDRESSES.PLASMA_TESTNET.DAI,
      symbol: 'DAI',
      decimals: 18,
      logo: '/tokens/dai.png'
    }
  ];

  useEffect(() => {
    if (fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0) {
      const fetchQuote = async () => {
        const amount = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
        const result = await getSwapQuote(fromToken.address, toToken.address, amount.toString());
        
        if (result) {
          setQuote(result);
          setToAmount(
            ethers.utils.formatUnits(result.amountOut, toToken.decimals)
          );
        }
      };

      const timeoutId = setTimeout(fetchQuote, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [fromToken, toToken, fromAmount, getSwapQuote]);

  const handleSwap = async () => {
    if (!fromToken || !toToken || !fromAmount || !account) return;

    const amount = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
    const minAmountOut = ethers.utils.parseUnits(
      (parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toString(),
      toToken.decimals
    );
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

    const result = await executeSwap({
      fromToken: fromToken.address,
      toToken: toToken.address,
      amount: amount.toString(),
      minAmountOut: minAmountOut.toString(),
      deadline,
      useGaslessTransfer: useGasless && toToken.symbol === 'USDT'
    });

    if (result.success) {
      setFromAmount('');
      setToAmount('');
      // Show success notification
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  if (!isPlasmaNetwork) {
    return (
      <div className="swap-interface">
        <p>Please connect to Plasma network to use the swap</p>
      </div>
    );
  }

  return (
    <div className="swap-interface">
      <h2>Swap Tokens</h2>
      
      {/* From Token */}
      <div className="token-input">
        <label>From</label>
        <div className="input-group">
          <input
            type="number"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder="0.0"
          />
          <select
            value={fromToken?.address || ''}
            onChange={(e) => {
              const token = tokens.find(t => t.address === e.target.value);
              setFromToken(token || null);
            }}
          >
            <option value="">Select token</option>
            {tokens.map(token => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Switch Button */}
      <button onClick={switchTokens} className="switch-button">
        ⇅
      </button>

      {/* To Token */}
      <div className="token-input">
        <label>To</label>
        <div className="input-group">
          <input
            type="number"
            value={toAmount}
            readOnly
            placeholder="0.0"
          />
          <select
            value={toToken?.address || ''}
            onChange={(e) => {
              const token = tokens.find(t => t.address === e.target.value);
              setToToken(token || null);
            }}
          >
            <option value="">Select token</option>
            {tokens.map(token => (
              <option key={token.address} value={token.address}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Settings */}
      <div className="swap-settings">
        <div className="slippage-setting">
          <label>Slippage Tolerance</label>
          <input
            type="number"
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            step="0.1"
            min="0.1"
            max="50"
          />
          <span>%</span>
        </div>
        
        {toToken?.symbol === 'USDT' && (
          <div className="gasless-setting">
            <label>
              <input
                type="checkbox"
                checked={useGasless}
                onChange={(e) => setUseGasless(e.target.checked)}
              />
              Use gasless transfer (USD₮ only)
            </label>
          </div>
        )}
      </div>

      {/* Quote Info */}
      {quote && (
        <div className="quote-info">
          <p>Fee: {quote.fee} basis points</p>
          <p>Price Impact: {quote.priceImpact}%</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={loading || !fromToken || !toToken || !fromAmount || !account}
        className="swap-button"
      >
        {loading ? 'Swapping...' : 'Swap'}
      </button>
    </div>
  );
};
```

## 🌉 Bridge Implementation

### 1. Bridge Hook

```typescript
// src/hooks/useBridge.ts
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useContracts } from './useContracts';
import { BridgeParams, BridgeTransaction } from '../types/contracts';

export const useBridge = () => {
  const contracts = useContracts();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bridgeOut = useCallback(async (params: BridgeParams) => {
    if (!contracts) throw new Error('Contracts not initialized');

    setLoading(true);
    setError(null);

    try {
      // 1. Estimate fees
      const { fee, bridgeAmount } = await contracts.bridgeHandler.estimateBridgeFee(
        params.token,
        params.amount
      );

      // 2. Check allowance and approve
      const tokenContract = new ethers.Contract(
        params.token,
        ['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)'],
        contracts.bridgeHandler.signer
      );

      const allowance = await tokenContract.allowance(
        await contracts.bridgeHandler.signer.getAddress(),
        contracts.bridgeHandler.address
      );

      if (allowance.lt(params.amount)) {
        const approveTx = await tokenContract.approve(
          contracts.bridgeHandler.address,
          ethers.constants.MaxUint256
        );
        await approveTx.wait();
      }

      // 3. Execute bridge
      const tx = await contracts.bridgeHandler.bridgeOut(
        params.token,
        params.amount,
        params.recipient,
        params.destinationChainId
      );

      const receipt = await tx.wait();
      
      // 4. Parse bridge event
      const bridgeEvent = receipt.events?.find(
        (e: any) => e.event === 'BridgeOutInitiated'
      );

      return {
        success: true,
        txHash: receipt.transactionHash,
        bridgeId: bridgeEvent?.args?.bridgeId?.toString(),
        fee: fee.toString(),
        bridgeAmount: bridgeAmount.toString()
      };

    } catch (err: any) {
      setError(err.message || 'Bridge failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  const gaslessUSDTTransfer = useCallback(async (params: BridgeParams) => {
    if (!contracts) throw new Error('Contracts not initialized');

    setLoading(true);
    setError(null);

    try {
      const tx = await contracts.bridgeHandler.gaslessUSDTTransfer(
        params.token,
        params.amount,
        params.recipient,
        params.destinationChainId
      );

      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        gasless: true
      };

    } catch (err: any) {
      setError(err.message || 'Gasless transfer failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  const getBridgeTransaction = useCallback(async (bridgeId: string): Promise<BridgeTransaction | null> => {
    if (!contracts) return null;

    try {
      const tx = await contracts.bridgeHandler.getBridgeTransaction(bridgeId);
      return tx as BridgeTransaction;
    } catch (err) {
      console.error('Failed to get bridge transaction:', err);
      return null;
    }
  }, [contracts]);

  const getUserBridges = useCallback(async (userAddress: string): Promise<string[]> => {
    if (!contracts) return [];

    try {
      const bridgeIds = await contracts.bridgeHandler.getUserBridges(userAddress);
      return bridgeIds.map((id: any) => id.toString());
    } catch (err) {
      console.error('Failed to get user bridges:', err);
      return [];
    }
  }, [contracts]);

  return {
    bridgeOut,
    gaslessUSDTTransfer,
    getBridgeTransaction,
    getUserBridges,
    loading,
    error
  };
};
```

### 2. Bridge Component

```typescript
// src/components/BridgeInterface.tsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useBridge } from '../hooks/useBridge';
import { useWallet } from '../hooks/useWallet';
import { TOKEN_ADDRESSES } from '../config/contracts';

const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', logo: '/chains/ethereum.png' },
  { id: 56, name: 'BSC', logo: '/chains/bsc.png' },
  { id: 137, name: 'Polygon', logo: '/chains/polygon.png' },
  { id: 42161, name: 'Arbitrum', logo: '/chains/arbitrum.png' },
  { id: 10, name: 'Optimism', logo: '/chains/optimism.png' }
];

export const BridgeInterface: React.FC = () => {
  const { account, chainId, isPlasmaNetwork } = useWallet();
  const { bridgeOut, gaslessUSDTTransfer, loading, error } = useBridge();
  
  const [selectedToken, setSelectedToken] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [destinationChain, setDestinationChain] = useState(1);
  const [useGasless, setUseGasless] = useState(false);

  useEffect(() => {
    if (account) {
      setRecipient(account);
    }
  }, [account]);

  const handleBridge = async () => {
    if (!selectedToken || !amount || !recipient) return;

    const bridgeParams = {
      token: selectedToken,
      amount: ethers.utils.parseUnits(amount, 18).toString(),
      recipient,
      destinationChainId: destinationChain
    };

    let result;
    if (useGasless && selectedToken === TOKEN_ADDRESSES.PLASMA_TESTNET.USDT) {
      result = await gaslessUSDTTransfer(bridgeParams);
    } else {
      result = await bridgeOut(bridgeParams);
    }

    if (result.success) {
      setAmount('');
      // Show success notification
    }
  };

  return (
    <div className="bridge-interface">
      <h2>Bridge Assets</h2>
      
      {/* Token Selection */}
      <div className="form-group">
        <label>Token</label>
        <select
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
        >
          <option value="">Select token</option>
          <option value={TOKEN_ADDRESSES.PLASMA_TESTNET.USDT}>USDT</option>
          <option value={TOKEN_ADDRESSES.PLASMA_TESTNET.USDC}>USDC</option>
          <option value={TOKEN_ADDRESSES.PLASMA_TESTNET.DAI}>DAI</option>
          <option value={TOKEN_ADDRESSES.PLASMA_TESTNET.WBTC}>wBTC</option>
          <option value={TOKEN_ADDRESSES.PLASMA_TESTNET.WETH}>wETH</option>
        </select>
      </div>

      {/* Amount Input */}
      <div className="form-group">
        <label>Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
        />
      </div>

      {/* Destination Chain */}
      <div className="form-group">
        <label>Destination Chain</label>
        <select
          value={destinationChain}
          onChange={(e) => setDestinationChain(Number(e.target.value))}
        >
          {SUPPORTED_CHAINS.map(chain => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      {/* Recipient Address */}
      <div className="form-group">
        <label>Recipient Address</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
        />
      </div>

      {/* Gasless Option */}
      {selectedToken === TOKEN_ADDRESSES.PLASMA_TESTNET.USDT && (
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={useGasless}
              onChange={(e) => setUseGasless(e.target.checked)}
            />
            Use gasless transfer (USD₮ only)
          </label>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Bridge Button */}
      <button
        onClick={handleBridge}
        disabled={loading || !selectedToken || !amount || !recipient}
        className="bridge-button"
      >
        {loading ? 'Bridging...' : 'Bridge'}
      </button>
    </div>
  );
};
```

## 📊 Price Oracle Integration

```typescript
// src/hooks/usePriceOracle.ts
import { useState, useEffect, useCallback } from 'react';
import { useContracts } from './useContracts';
import { PriceData } from '../types/contracts';

export const usePriceOracle = () => {
  const contracts = useContracts();
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(false);

  const getPrice = useCallback(async (tokenAddress: string) => {
    if (!contracts) return null;

    try {
      const price = await contracts.priceOracle.getPrice(tokenAddress);
      return price.toString();
    } catch (err) {
      console.error('Failed to get price:', err);
      return null;
    }
  }, [contracts]);

  const getPriceData = useCallback(async (tokenAddress: string) => {
    if (!contracts) return null;

    try {
      const data = await contracts.priceOracle.getPriceData(tokenAddress);
      return {
        price: data.price.toString(),
        confidence: data.confidence.toNumber(),
        timestamp: data.timestamp.toNumber(),
        isValid: data.isValid
      };
    } catch (err) {
      console.error('Failed to get price data:', err);
      return null;
    }
  }, [contracts]);

  const getTWAP = useCallback(async (tokenAddress: string, window: number) => {
    if (!contracts) return null;

    try {
      const twap = await contracts.priceOracle.getTWAP(tokenAddress, window);
      return twap.toString();
    } catch (err) {
      console.error('Failed to get TWAP:', err);
      return null;
    }
  }, [contracts]);

  return {
    prices,
    getPrice,
    getPriceData,
    getTWAP,
    loading
  };
};
```

## 🎨 Styling

```css
/* src/styles/components.css */
.swap-interface,
.bridge-interface {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.token-input {
  margin-bottom: 16px;
}

.input-group {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.input-group input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.input-group select {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.switch-button {
  width: 40px;
  height: 40px;
  border: 2px solid #007bff;
  border-radius: 50%;
  background: white;
  color: #007bff;
  font-size: 18px;
  cursor: pointer;
  margin: 8px auto;
  display: block;
}

.switch-button:hover {
  background: #007bff;
  color: white;
}

.swap-settings {
  margin: 16px 0;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #eee;
}

.slippage-setting {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.slippage-setting input {
  width: 60px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.gasless-setting label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.quote-info {
  margin: 16px 0;
  padding: 12px;
  background: #e3f2fd;
  border-radius: 8px;
  font-size: 14px;
}

.error-message {
  margin: 16px 0;
  padding: 12px;
  background: #ffebee;
  color: #c62828;
  border-radius: 8px;
  font-size: 14px;
}

.swap-button,
.bridge-button {
  width: 100%;
  padding: 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.swap-button:hover,
.bridge-button:hover {
  background: #0056b3;
}

.swap-button:disabled,
.bridge-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}
```

## 📱 Mobile Responsive

```css
/* src/styles/responsive.css */
@media (max-width: 768px) {
  .swap-interface,
  .bridge-interface {
    margin: 10px;
    padding: 16px;
  }

  .input-group {
    flex-direction: column;
  }

  .input-group input,
  .input-group select {
    width: 100%;
  }

  .slippage-setting {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

## 🚀 Usage Example

```typescript
// src/App.tsx
import React from 'react';
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { SwapInterface } from './components/SwapInterface';
import { BridgeInterface } from './components/BridgeInterface';
import { useWallet } from './hooks/useWallet';

function getLibrary(provider: any): Web3Provider {
  const library = new Web3Provider(provider);
  library.pollingInterval = 12000;
  return library;
}

const AppContent: React.FC = () => {
  const { connect, disconnect, account, isPlasmaNetwork, switchToPlasmaTestnet } = useWallet();

  return (
    <div className="app">
      <header>
        <h1>Plasma Stablecoin Swap & Bridge</h1>
        
        {account ? (
          <div>
            <span>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
            <button onClick={disconnect}>Disconnect</button>
          </div>
        ) : (
          <button onClick={connect}>Connect Wallet</button>
        )}
        
        {account && !isPlasmaNetwork && (
          <button onClick={switchToPlasmaTestnet}>Switch to Plasma</button>
        )}
      </header>

      <main>
        <div className="interface-container">
          <SwapInterface />
          <BridgeInterface />
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <AppContent />
    </Web3ReactProvider>
  );
}

export default App;
```

## 🔐 Security Best Practices

1. **Always validate user inputs**
2. **Use exact token addresses from your configuration**
3. **Implement proper error handling**
4. **Add slippage protection**
5. **Show transaction confirmations**
6. **Implement rate limiting on the frontend**
7. **Use HTTPS for all API calls**
8. **Validate signatures for gasless transactions**

## 📝 Testing

```typescript
// src/test/swap.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useSwap } from '../hooks/useSwap';

describe('useSwap', () => {
  it('should execute swap successfully', async () => {
    const { result } = renderHook(() => useSwap());
    
    await act(async () => {
      const swapResult = await result.current.executeSwap({
        fromToken: '0x...',
        toToken: '0x...',
        amount: '1000000000000000000',
        minAmountOut: '990000000000000000',
        deadline: Math.floor(Date.now() / 1000) + 1800,
        useGaslessTransfer: false
      });
      
      expect(swapResult.success).toBe(true);
    });
  });
});
```

This comprehensive guide provides everything needed to integrate with the Plasma Stablecoin Swap & Bridge protocol. The implementation includes proper error handling, loading states, and follows React best practices for Web3 integration.
