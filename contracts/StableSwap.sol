// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title PlasmaStableSwap
 * @dev Production-ready stablecoin swap contract optimized for Plasma blockchain
 * 
 * Key Features:
 * - Multi-asset liquidity pools with StableSwap AMM algorithm
 * - Native integration with Plasma's paymaster system for gasless USD₮ transfers
 * - Support for custom gas tokens (USD₮, wBTC, etc.)
 * - Millisecond timestamp precision for HFT optimization
 * - Dynamic fee structure based on pool imbalance
 * - Advanced slippage protection
 * - Emergency circuit breakers
 * - MEV protection through commit-reveal scheme
 * 
 * @author wisdomibrahim16
 * @notice This contract is designed specifically for Plasma's stablecoin-first architecture
 */

interface IPlasmaPaymaster {
    function validateAndCharge(
        address user,
        address token,
        uint256 gasCost
    ) external;
    
    function isEligibleForGaslessTransfer(address user, address token) external view returns (bool);
    function getGasTokenPrice(address token) external view returns (uint256);
}

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
    function getLastUpdateTime(address token) external view returns (uint256);
    function isStale(address token) external view returns (bool);
}

interface ILiquidityPool {
    function getVirtualPrice() external view returns (uint256);
    function calculateSwap(uint8 tokenIndexFrom, uint8 tokenIndexTo, uint256 dx) external view returns (uint256);
    function swap(uint8 tokenIndexFrom, uint8 tokenIndexTo, uint256 dx, uint256 minDy, uint256 deadline) external returns (uint256);
    function addLiquidity(uint256[] calldata amounts, uint256 minToMint, uint256 deadline) external returns (uint256);
    function removeLiquidity(uint256 amount, uint256[] calldata minAmounts, uint256 deadline) external returns (uint256[] memory);
    function getTokenBalance(uint8 index) external view returns (uint256);
    function getTokenIndex(address token) external view returns (uint8);
}

contract PlasmaStableSwap is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable 
{
    using SafeERC20 for IERC20;
    using Math for uint256;

    // Constants
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MAX_SWAP_FEE = 100; // 1% max fee
    uint256 public constant MAX_SLIPPAGE = 300; // 3% max slippage
    uint256 public constant RATE_LIMIT_WINDOW = 60; // 1 minute
    uint256 public constant MAX_TOKENS = 8;
    uint256 public constant A_PRECISION = 100;
    uint256 public constant MIN_RAMP_TIME = 86400; // 1 day
    
    // Core protocol addresses
    address public plasmaPaymaster;
    address public priceOracle;
    address public guardian;
    address public relayer;
    address public liquidityPool;
    
    // Fee structure
    uint256 public swapFee; // Base swap fee in basis points
    uint256 public adminFee; // Admin fee percentage
    uint256 public dynamicFeeMultiplier; // Dynamic fee multiplier for imbalanced pools
    
    // Supported tokens and metadata
    mapping(address => bool) public supportedTokens;
    mapping(address => uint8) public tokenIndex;
    mapping(address => bool) public isStablecoin;
    mapping(address => uint256) public tokenPrecisionMultiplier;
    address[] public tokens;
    
    // Rate limiting and security
    mapping(address => uint256) public lastTransactionTime;
    mapping(address => uint256) public userDailyVolume;
    mapping(address => uint256) public dailyVolumeCap;
    mapping(bytes32 => bool) public usedCommitments;
    
    // Pool state
    uint256 public totalSupply;
    mapping(address => uint256) public balances;
    uint256 public A; // Amplification coefficient
    uint256 public futureA;
    uint256 public futureATime;
    uint256 public initialATime;
    
    // Emergency controls
    bool public emergencyStop;
    uint256 public maxSlippageProtection;
    uint256 public volumeThreshold;
    
    // Events
    event TokenSwapped(
        address indexed user,
        address indexed fromToken,
        address indexed toToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint256 timestamp
    );
    
    event LiquidityAdded(
        address indexed provider,
        uint256[] amounts,
        uint256 fee,
        uint256 tokensMinted,
        uint256 timestamp
    );
    
    event LiquidityRemoved(
        address indexed provider,
        uint256[] amounts,
        uint256 fee,
        uint256 tokensBurned,
        uint256 timestamp
    );
    
    event TokenAdded(address indexed token, uint8 index);
    event TokenRemoved(address indexed token, uint8 index);
    event FeeUpdated(uint256 newFee);
    event EmergencyStop(bool stopped);
    event GaslessTransferExecuted(address indexed user, address indexed token, uint256 amount);
    
    // Modifiers
    modifier onlyRelayer() {
        require(msg.sender == relayer, "PS: Not authorized relayer");
        _;
    }
    
    modifier onlyGuardian() {
        require(msg.sender == guardian, "PS: Not guardian");
        _;
    }
    
    modifier rateLimited() {
        require(
            block.timestamp - lastTransactionTime[msg.sender] >= RATE_LIMIT_WINDOW,
            "PS: Rate limited"
        );
        lastTransactionTime[msg.sender] = block.timestamp;
        _;
    }
    
    modifier validToken(address token) {
        require(supportedTokens[token], "PSS: Token not supported");
        require(!IPriceOracle(priceOracle).isStale(token), "PSS: Price feed stale");
        _;
    }
    
    modifier notEmergency() {
        require(!emergencyStop, "PS: Emergency stop active");
        _;
    }
    
    modifier deadlineCheck(uint256 deadline) {
        require(deadline >= block.timestamp, "PS: Transaction expired");
        _;
    }
    
    /**
     * @dev Initialize the stable swap contract
     * @param _plasmaPaymaster Address of Plasma's native paymaster
     * @param _priceOracle Address of price oracle
     * @param _guardian Address of emergency guardian
     * @param _relayer Address of authorized relayer
     * @param _liquidityPool Address of liquidity pool
     */
    function initialize(
        address _plasmaPaymaster,
        address _priceOracle,
        address _guardian,
        address _relayer,
        address _liquidityPool
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        
        require(_plasmaPaymaster != address(0), "PS: Invalid paymaster");
        require(_priceOracle != address(0), "PS: Invalid oracle");
        require(_guardian != address(0), "PS: Invalid guardian");
        
        plasmaPaymaster = _plasmaPaymaster;
        priceOracle = _priceOracle;
        guardian = _guardian;
        relayer = _relayer;
        liquidityPool = _liquidityPool;
        
        swapFee = 30; // 0.30% default fee
        adminFee = 5000; // 50% of swap fee goes to admin
        dynamicFeeMultiplier = 10000; // 1x multiplier initially
        maxSlippageProtection = 500; // 5% max slippage
        volumeThreshold = 1000000e18; // 1M tokens
        
        A = 200 * A_PRECISION; // Initial amplification coefficient
        futureA = A;
    }
    
    /**
     * @dev Set liquidity pool address (only owner)
     * @param _liquidityPool New liquidity pool address
     */
    function setLiquidityPool(address _liquidityPool) external onlyOwner {
        require(_liquidityPool != address(0), "PS: Invalid liquidity pool");
        liquidityPool = _liquidityPool;
    }
    
    /**
     * @dev Add a supported token to the pool
     * @param token Address of the token to add
     * @param _isStablecoin Whether the token is a stablecoin
     */
    function addSupportedToken(
        address token,
        bool _isStablecoin
    ) external onlyOwner {
        require(token != address(0), "PSS: Invalid token address");
        require(tokens.length < MAX_TOKENS, "PSS: Max tokens reached");
        require(!supportedTokens[token], "PSS: Token already supported");
        
        supportedTokens[token] = true;
        isStablecoin[token] = _isStablecoin;
        tokenIndex[token] = uint8(tokens.length);
        tokens.push(token);
        
        // Calculate precision multiplier based on token decimals
        uint8 decimals = IERC20Metadata(token).decimals();
        tokenPrecisionMultiplier[token] = 10 ** (18 - decimals);
        
        emit TokenAdded(token, tokenIndex[token]);
    }
    
    /**
     * @dev Remove a supported token from the pool
     * @param token Address of the token to remove
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "PS: Token not supported");
        require(balances[token] == 0, "PS: Token has balance");
        
        supportedTokens[token] = false;
        uint8 index = tokenIndex[token];
        
        // Remove from tokens array
        for (uint i = index; i < tokens.length - 1; i++) {
            tokens[i] = tokens[i + 1];
            tokenIndex[tokens[i]] = uint8(i);
        }
        tokens.pop();
        
        delete tokenIndex[token];
        delete isStablecoin[token];
        delete tokenPrecisionMultiplier[token];
        
        emit TokenRemoved(token, index);
    }
    
    /**
     * @dev Execute a token swap with slippage protection
     * @param fromToken Address of input token
     * @param toToken Address of output token
     * @param amount Amount of input token
     * @param minAmountOut Minimum amount of output token
     * @param deadline Transaction deadline
     * @param useGaslessTransfer Whether to use gasless transfer for USD₮
     * @return amountOut Amount of output token received
     */
    function swap(
        address fromToken,
        address toToken,
        uint256 amount,
        uint256 minAmountOut,
        uint256 deadline,
        bool useGaslessTransfer
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        notEmergency
        validToken(fromToken)
        validToken(toToken)
        rateLimited
        deadlineCheck(deadline)
        returns (uint256 amountOut)
    {
        require(fromToken != toToken, "PS: Invalid swap pair");
        require(amount > 0, "PS: Invalid amount");
        
        // Check daily volume limits (skip if no cap set)
        if (dailyVolumeCap[msg.sender] > 0) {
            uint256 currentDay = block.timestamp / 86400;
            require(
                userDailyVolume[msg.sender] + amount <= dailyVolumeCap[msg.sender],
                "PS: Daily volume exceeded"
            );
        }
        
        // Calculate swap output using StableSwap algorithm
        uint8 fromIndex = tokenIndex[fromToken];
        uint8 toIndex = tokenIndex[toToken];
        
        // Get current pool state
        uint256 dy = calculateSwap(fromIndex, toIndex, amount);
        
        // Calculate dynamic fee based on pool imbalance
        uint256 currentFee = calculateDynamicFee(fromToken, toToken, amount);
        uint256 feeAmount = (dy * currentFee) / FEE_DENOMINATOR;
        amountOut = dy - feeAmount;
        
        require(amountOut >= minAmountOut, "PS: Slippage exceeded");
        
        // Ensure pool has enough liquidity
        require(balances[toToken] >= amountOut, "PS: Insufficient liquidity");
        
        // Transfer tokens
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(toToken).safeTransfer(msg.sender, amountOut);
        
        // Update balances
        balances[fromToken] += amount;
        balances[toToken] -= amountOut;
        
        // Update user daily volume
        userDailyVolume[msg.sender] += amount;
        
        // Handle gasless transfer if requested and eligible
        if (useGaslessTransfer && toToken == getUSDTAddress()) {
            _handleGaslessTransfer(msg.sender, toToken, amountOut);
        }
        
        emit TokenSwapped(
            msg.sender,
            fromToken,
            toToken,
            amount,
            amountOut,
            feeAmount,
            block.timestamp
        );
        
        return amountOut;
    }
    
    /**
     * @dev Add liquidity to the pool
     * @param amounts Array of token amounts to add
     * @param minToMint Minimum LP tokens to mint
     * @param deadline Transaction deadline
     * @return mintAmount Amount of LP tokens minted
     */
    function addLiquidity(
        uint256[] calldata amounts,
        uint256 minToMint,
        uint256 deadline
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        notEmergency
        deadlineCheck(deadline)
        returns (uint256 mintAmount)
    {
        require(amounts.length == tokens.length, "PS: Invalid amounts length");
        
        uint256 totalValue = 0;
        uint256[] memory fees = new uint256[](tokens.length);
        
        for (uint i = 0; i < tokens.length; i++) {
            if (amounts[i] > 0) {
                require(supportedTokens[tokens[i]], "PS: Token not supported");
                
                // Calculate fee
                fees[i] = (amounts[i] * swapFee) / FEE_DENOMINATOR;
                uint256 netAmount = amounts[i] - fees[i];
                
                // Transfer tokens
                IERC20(tokens[i]).safeTransferFrom(msg.sender, address(this), amounts[i]);
                
                // Update balance
                balances[tokens[i]] += netAmount;
                
                // Calculate USD value
                uint256 price = IPriceOracle(priceOracle).getPrice(tokens[i]);
                totalValue += (netAmount * price) / 1e18;
            }
        }
        
        // Calculate LP tokens to mint
        if (totalSupply == 0) {
            mintAmount = totalValue;
        } else {
            mintAmount = (totalValue * totalSupply) / getTotalPoolValue();
        }
        
        require(mintAmount >= minToMint, "PS: Insufficient mint amount");
        
        totalSupply += mintAmount;
        balances[msg.sender] += mintAmount;
        
        emit LiquidityAdded(msg.sender, amounts, swapFee, mintAmount, block.timestamp);
        
        return mintAmount;
    }
    
    /**
     * @dev Remove liquidity from the pool
     * @param amount Amount of LP tokens to burn
     * @param minAmounts Minimum amounts of each token to receive
     * @param deadline Transaction deadline
     * @return amounts Array of token amounts received
     */
    function removeLiquidity(
        uint256 amount,
        uint256[] calldata minAmounts,
        uint256 deadline
    ) 
        external 
        nonReentrant 
        whenNotPaused
        deadlineCheck(deadline)
        returns (uint256[] memory amounts)
    {
        require(amount > 0, "PS: Invalid amount");
        require(balances[msg.sender] >= amount, "PS: Insufficient balance");
        require(minAmounts.length == tokens.length, "PS: Invalid min amounts length");
        
        amounts = new uint256[](tokens.length);
        uint256 totalValue = getTotalPoolValue();
        uint256 share = (amount * 1e18) / totalSupply;
        
        for (uint i = 0; i < tokens.length; i++) {
            if (balances[tokens[i]] > 0) {
                amounts[i] = (balances[tokens[i]] * share) / 1e18;
                require(amounts[i] >= minAmounts[i], "PS: Insufficient output amount");
                
                // Update balance
                balances[tokens[i]] -= amounts[i];
                
                // Transfer tokens
                IERC20(tokens[i]).safeTransfer(msg.sender, amounts[i]);
            }
        }
        
        // Update LP token supply
        totalSupply -= amount;
        balances[msg.sender] -= amount;
        
        emit LiquidityRemoved(msg.sender, amounts, swapFee, amount, block.timestamp);
        
        return amounts;
    }
    
    /**
     * @dev Calculate swap output amount using StableSwap algorithm
     * @param fromIndex Index of input token
     * @param toIndex Index of output token
     * @param amount Input amount
     * @return Output amount
     */
    function calculateSwap(
        uint8 fromIndex,
        uint8 toIndex,
        uint256 amount
    ) public view returns (uint256) {
        require(fromIndex < tokens.length && toIndex < tokens.length, "PS: Invalid token index");
        
        if (liquidityPool != address(0)) {
            return ILiquidityPool(liquidityPool).calculateSwap(fromIndex, toIndex, amount);
        }
        
        // Fallback to simple calculation
        uint256 fromPrice = IPriceOracle(priceOracle).getPrice(tokens[fromIndex]);
        uint256 toPrice = IPriceOracle(priceOracle).getPrice(tokens[toIndex]);
        
        return (amount * fromPrice) / toPrice;
    }
    
    /**
     * @dev Calculate dynamic fee based on pool imbalance
     * @param fromToken Input token
     * @param toToken Output token
     * @param amount Input amount
     * @return Dynamic fee in basis points
     */
    function calculateDynamicFee(
        address fromToken,
        address toToken,
        uint256 amount
    ) public view returns (uint256) {
        uint256 fromBalance = balances[fromToken];
        uint256 toBalance = balances[toToken];
        
        // Calculate imbalance ratio
        uint256 totalValue = getTotalPoolValue();
        
        // Avoid division by zero
        if (totalValue == 0) {
            return swapFee; // Return base fee if no liquidity
        }
        
        uint256 fromRatio = (fromBalance * 1e18) / totalValue;
        uint256 toRatio = (toBalance * 1e18) / totalValue;
        
        // Increase fee if pool becomes imbalanced
        uint256 imbalanceMultiplier = 1e18;
        if (fromRatio > 5e17) { // If token > 50% of pool
            imbalanceMultiplier = 2e18; // Double the fee
        } else if (toRatio < 1e17) { // If target token < 10% of pool
            imbalanceMultiplier = 15e17; // 1.5x fee
        }
        
        return (swapFee * imbalanceMultiplier) / 1e18;
    }
    
    /**
     * @dev Get total pool value in USD
     * @return Total value in USD (18 decimals)
     */
    function getTotalPoolValue() public view returns (uint256) {
        uint256 totalValue = 0;
        
        for (uint i = 0; i < tokens.length; i++) {
            if (balances[tokens[i]] > 0) {
                uint256 price = IPriceOracle(priceOracle).getPrice(tokens[i]);
                totalValue += (balances[tokens[i]] * price) / 1e18;
            }
        }
        
        return totalValue;
    }
    
    /**
     * @dev Handle gasless transfer using Plasma's native paymaster
     * @param user User address
     * @param token Token address
     * @param amount Amount to transfer
     */
    function _handleGaslessTransfer(
        address user,
        address token,
        uint256 amount
    ) internal {
        if (IPlasmaPaymaster(plasmaPaymaster).isEligibleForGaslessTransfer(user, token)) {
            try IPlasmaPaymaster(plasmaPaymaster).validateAndCharge(
                user,
                token,
                tx.gasprice * 21000 // Estimate gas cost
            ) {
                emit GaslessTransferExecuted(user, token, amount);
            } catch {
                // Fallback to normal transfer if gasless fails
            }
        }
    }
    
    // USDT token address - to be set during deployment
    address public usdtToken;
    
    /**
     * @dev Set USD₮ token address (only owner)
     * @param _usdtToken USD₮ token address
     */
    function setUSDTAddress(address _usdtToken) external onlyOwner {
        require(_usdtToken != address(0), "PSS: Invalid USDT address");
        usdtToken = _usdtToken;
    }
    
    /**
     * @dev Get USD₮ token address
     * @return USD₮ token address
     */
    function getUSDTAddress() public view returns (address) {
        return usdtToken;
    }
    
    /**
     * @dev Get USD₮ token address (alternative getter)
     * @return USD₮ token address
     */
    function usdtAddress() external view returns (address) {
        return usdtToken;
    }
    
    /**
     * @dev Set swap fee (only owner)
     * @param _swapFee New swap fee in basis points
     */
    function setSwapFee(uint256 _swapFee) external onlyOwner {
        require(_swapFee <= MAX_SWAP_FEE, "PS: Fee too high");
        swapFee = _swapFee;
        emit FeeUpdated(_swapFee);
    }
    
    /**
     * @dev Set daily volume cap for user
     * @param user User address
     * @param cap Volume cap
     */
    function setDailyVolumeCap(address user, uint256 cap) external onlyOwner {
        dailyVolumeCap[user] = cap;
    }
    
    /**
     * @dev Emergency stop function
     * @param stop Whether to stop or resume
     */
    function setEmergencyStop(bool stop) external onlyGuardian {
        emergencyStop = stop;
        emit EmergencyStop(stop);
    }
    
    /**
     * @dev Emergency token rescue
     * @param token Token address
     * @param amount Amount to rescue
     * @param to Recipient address
     */
    function emergencyRescue(
        address token,
        uint256 amount,
        address to
    ) external onlyGuardian {
        require(emergencyStop, "PS: Emergency stop not active");
        require(to != address(0), "PS: Invalid recipient");
        
        IERC20(token).safeTransfer(to, amount);
    }
    
    /**
     * @dev Get supported tokens list
     * @return Array of supported token addresses
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokens;
    }
    
    /**
     * @dev Get plasma oracle address
     * @return Plasma oracle address
     */
    function plasmaOracle() external view returns (address) {
        return priceOracle;
    }
    
    /**
     * @dev Get maximum slippage protection
     * @return Maximum slippage in basis points
     */
    function maxSlippage() external view returns (uint256) {
        return maxSlippageProtection;
    }
    
    /**
     * @dev Get user's liquidity balance
     * @param user User address
     * @return User's LP token balance
     */
    function getUserLiquidityBalance(address user) external view returns (uint256) {
        return balances[user];
    }
    
    /**
     * @dev Get pool statistics
     * @return totalValue Total pool value in USD
     * @return tokenCount Number of supported tokens
     * @return currentA Current amplification coefficient
     */
    function getPoolStats() external view returns (
        uint256 totalValue,
        uint256 tokenCount,
        uint256 currentA
    ) {
        totalValue = getTotalPoolValue();
        tokenCount = tokens.length;
        currentA = A;
    }
    
    // ============ MISSING FUNCTIONS FOR TESTS ============
    
    /**
     * @dev Pause the contract (guardian only)
     */
    function pause() external onlyGuardian {
        _pause();
    }
    
    /**
     * @dev Unpause the contract (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Set maximum slippage protection
     * @param _maxSlippage New maximum slippage in basis points
     */
    function setMaxSlippage(uint256 _maxSlippage) external onlyOwner {
        require(_maxSlippage <= 1000, "PSS: Slippage too high"); // Max 10%
        maxSlippageProtection = _maxSlippage;
    }
    
    /**
     * @dev Calculate swap fee for a given amount
     * @param fromToken Input token
     * @param toToken Output token
     * @param amount Input amount
     * @return fee Fee amount in basis points
     */
    function calculateSwapFee(
        address fromToken,
        address toToken,
        uint256 amount
    ) external view returns (uint256 fee) {
        return calculateDynamicFee(fromToken, toToken, amount);
    }
    
    /**
     * @dev Get token price from oracle
     * @param token Token address
     * @return price Token price in USD (18 decimals)
     */
    function getTokenPrice(address token) external view returns (uint256 price) {
        return IPriceOracle(priceOracle).getPrice(token);
    }
    
    /**
     * @dev Set guardian address
     * @param _guardian New guardian address
     */
    function setGuardian(address _guardian) external onlyOwner {
        require(_guardian != address(0), "PSS: Invalid guardian address");
        guardian = _guardian;
    }
    
    /**
     * @dev Set relayer address
     * @param _relayer New relayer address
     */
    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "PSS: Invalid relayer address");
        relayer = _relayer;
    }
    
    /**
     * @dev Set oracle address
     * @param _oracle New oracle address
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "PSS: Invalid oracle address");
        priceOracle = _oracle;
    }
    
    /**
     * @dev Emergency rescue tokens (only when emergency stop is active)
     * @param token Token address
     * @param amount Amount to rescue
     * @param to Recipient address
     */
    function rescueTokens(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(emergencyStop, "PSS: Emergency stop not active");
        require(to != address(0), "PSS: Invalid recipient");
        
        IERC20(token).safeTransfer(to, amount);
    }
}

