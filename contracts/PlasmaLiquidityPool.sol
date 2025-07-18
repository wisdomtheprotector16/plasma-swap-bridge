// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PlasmaLiquidityPool
 * @dev Simple liquidity pool contract for Plasma's stablecoin ecosystem
 *
 * Features:
 * - Add and remove liquidity to the pool
 * - Supports multiple stablecoin tokens
 * - Calculates pool share and virtual price for AMM
 */
contract PlasmaLiquidityPool is Initializable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    // Supported tokens
    address[] public supportedTokens;
    mapping(address => bool) public isSupportedToken;

    // Balances
    mapping(address => uint256) public tokenBalances;
    uint256 public totalSupply;

    // Events
    event LiquidityAdded(address indexed provider, uint256[] amounts, uint256 poolTokens);
    event LiquidityRemoved(address indexed provider, uint256[] amounts, uint256 poolTokens);

    /**
     * @dev Initialize liquidity pool
     */
    function initialize(address[] calldata _tokens) public initializer {
        __Ownable_init();
        supportedTokens = _tokens;
        for (uint256 i = 0; i < _tokens.length; i++) {
            isSupportedToken[_tokens[i]] = true;
        }
    }

    /**
     * @dev Add liquidity to the pool
     */
    function addLiquidity(uint256[] calldata amounts) external {
        require(amounts.length == supportedTokens.length, "Invalid input length");
        uint256 poolTokens;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            require(isSupportedToken[supportedTokens[i]], "Unsupported token");
            IERC20(supportedTokens[i]).safeTransferFrom(msg.sender, address(this), amounts[i]);
            tokenBalances[supportedTokens[i]] += amounts[i];
            poolTokens += amounts[i];
        }
        totalSupply += poolTokens;
        emit LiquidityAdded(msg.sender, amounts, poolTokens);
    }

    /**
     * @dev Remove liquidity from the pool
     */
    function removeLiquidity(uint256 poolTokens, uint256[] calldata minAmounts) external {
        require(poolTokens <= totalSupply, "Insufficient pool balance");
        uint256[] memory amounts = new uint256[](supportedTokens.length);
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            amounts[i] = (tokenBalances[supportedTokens[i]] * poolTokens) / totalSupply;
            require(amounts[i] >= minAmounts[i], "Insufficient output");
            tokenBalances[supportedTokens[i]] -= amounts[i];
            IERC20(supportedTokens[i]).safeTransfer(msg.sender, amounts[i]);
        }
        totalSupply -= poolTokens;
        emit LiquidityRemoved(msg.sender, amounts, poolTokens);
    }

    /**
     * @dev Get virtual price of the pool
     */
    function getVirtualPrice() external view returns (uint256) {
        uint256 totalValue;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            totalValue += tokenBalances[supportedTokens[i]];
        }
        return totalSupply > 0 ? totalValue / totalSupply : 0;
    }
    
    /**
     * @dev Calculate swap output amount
     */
    function calculateSwap(uint8 tokenIndexFrom, uint8 tokenIndexTo, uint256 dx) external view returns (uint256) {
        require(tokenIndexFrom < supportedTokens.length && tokenIndexTo < supportedTokens.length, "Invalid token index");
        
        address fromToken = supportedTokens[tokenIndexFrom];
        address toToken = supportedTokens[tokenIndexTo];
        
        uint256 fromBalance = tokenBalances[fromToken];
        uint256 toBalance = tokenBalances[toToken];
        
        // Simple constant product formula for now
        if (fromBalance == 0 || toBalance == 0) {
            return 0;
        }
        
        return (dx * toBalance) / (fromBalance + dx);
    }
    
    /**
     * @dev Execute swap (stub implementation)
     */
    function swap(uint8 tokenIndexFrom, uint8 tokenIndexTo, uint256 dx, uint256 minDy, uint256 deadline) external returns (uint256) {
        require(deadline >= block.timestamp, "Transaction expired");
        
        uint256 dy = this.calculateSwap(tokenIndexFrom, tokenIndexTo, dx);
        require(dy >= minDy, "Slippage exceeded");
        
        address fromToken = supportedTokens[tokenIndexFrom];
        address toToken = supportedTokens[tokenIndexTo];
        
        // Transfer tokens
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), dx);
        IERC20(toToken).safeTransfer(msg.sender, dy);
        
        // Update balances
        tokenBalances[fromToken] += dx;
        tokenBalances[toToken] -= dy;
        
        return dy;
    }
    
    /**
     * @dev Add liquidity with deadline
     */
    function addLiquidity(uint256[] calldata amounts, uint256 minToMint, uint256 deadline) external returns (uint256) {
        require(deadline >= block.timestamp, "Transaction expired");
        require(amounts.length == supportedTokens.length, "Invalid input length");
        
        uint256 poolTokens;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (amounts[i] > 0) {
                IERC20(supportedTokens[i]).safeTransferFrom(msg.sender, address(this), amounts[i]);
                tokenBalances[supportedTokens[i]] += amounts[i];
                poolTokens += amounts[i];
            }
        }
        
        require(poolTokens >= minToMint, "Insufficient mint amount");
        totalSupply += poolTokens;
        
        emit LiquidityAdded(msg.sender, amounts, poolTokens);
        return poolTokens;
    }
    
    /**
     * @dev Remove liquidity with deadline
     */
    function removeLiquidity(uint256 amount, uint256[] calldata minAmounts, uint256 deadline) external returns (uint256[] memory) {
        require(deadline >= block.timestamp, "Transaction expired");
        require(amount <= totalSupply, "Insufficient pool balance");
        require(minAmounts.length == supportedTokens.length, "Invalid input length");
        
        uint256[] memory amounts = new uint256[](supportedTokens.length);
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            amounts[i] = (tokenBalances[supportedTokens[i]] * amount) / totalSupply;
            require(amounts[i] >= minAmounts[i], "Insufficient output");
            tokenBalances[supportedTokens[i]] -= amounts[i];
            IERC20(supportedTokens[i]).safeTransfer(msg.sender, amounts[i]);
        }
        
        totalSupply -= amount;
        emit LiquidityRemoved(msg.sender, amounts, amount);
        return amounts;
    }
    
    /**
     * @dev Get token balance by index
     */
    function getTokenBalance(uint8 index) external view returns (uint256) {
        require(index < supportedTokens.length, "Invalid token index");
        return tokenBalances[supportedTokens[index]];
    }
    
    /**
     * @dev Get token index by address
     */
    function getTokenIndex(address token) external view returns (uint8) {
        for (uint8 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                return i;
            }
        }
        revert("Token not found");
    }
}
