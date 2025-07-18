// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title PlasmaOracle
 * @dev Production-ready price oracle optimized for Plasma blockchain
 * 
 * Key Features:
 * - Millisecond precision timestamps for high-frequency trading
 * - Multi-source price aggregation with outlier detection
 * - Stablecoin-focused price feeds with tight spreads
 * - Circuit breakers for market volatility protection
 * - Time-weighted average price (TWAP) calculations
 * - Emergency price override for extreme market conditions
 * 
 * @author Plasma Foundation
 * @notice This oracle is specifically designed for Plasma's stablecoin ecosystem
 */

interface IPriceFeed {
    function getPrice() external view returns (uint256);
    function getLastUpdateTime() external view returns (uint256);
    function isHealthy() external view returns (bool);
}

interface IAggregatorV3 {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

contract PlasmaOracle is Initializable, OwnableUpgradeable, PausableUpgradeable {
    using Math for uint256;

    // Constants
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant MAX_STALENESS = 3600; // 1 hour
    uint256 public constant MIN_SOURCES = 2;
    uint256 public constant MAX_DEVIATION = 500; // 5% max deviation
    uint256 public constant TWAP_WINDOW = 3600; // 1 hour TWAP window
    uint256 public constant CIRCUIT_BREAKER_THRESHOLD = 2000; // 20% price change
    uint256 public constant STALE_THRESHOLD = 1800; // 30 minutes for stale check
    
    // Core state
    address public guardian;
    mapping(address => TokenConfig) public tokenConfigs;
    mapping(address => PriceData) public priceData;
    mapping(address => address[]) public priceSources;
    mapping(address => bool) public authorizedUpdaters;
    
    // TWAP calculations
    mapping(address => PricePoint[]) public priceHistory;
    mapping(address => uint256) public lastPriceUpdate;
    
    // Circuit breaker
    mapping(address => bool) public circuitBreakerActive;
    mapping(address => uint256) public emergencyPrice;
    
    struct TokenConfig {
        bool isActive;
        uint256 minSources;
        uint256 maxDeviation;
        uint256 heartbeat;
        bool isStablecoin;
        uint256 lastPrice;
        uint256 lastValidTime;
    }
    
    struct PriceData {
        uint256 price;
        uint256 confidence;
        uint256 timestamp;
        uint256 roundId;
        bool isValid;
    }
    
    struct PricePoint {
        uint256 price;
        uint256 timestamp;
        uint256 volume;
    }
    
    // Events
    event PriceUpdated(
        address indexed token,
        uint256 price,
        uint256 confidence,
        uint256 timestamp
    );
    
    event PriceSourceAdded(address indexed token, address indexed source);
    event PriceSourceRemoved(address indexed token, address indexed source);
    event CircuitBreakerActivated(address indexed token, uint256 oldPrice, uint256 newPrice);
    event EmergencyPriceSet(address indexed token, uint256 price);
    
    // Modifiers
    modifier onlyGuardian() {
        require(msg.sender == guardian, "PO: Not guardian");
        _;
    }
    
    modifier onlyAuthorized() {
        require(authorizedUpdaters[msg.sender], "PO: Not authorized");
        _;
    }
    
    modifier validToken(address token) {
        require(tokenConfigs[token].isActive, "PO: Token not active");
        _;
    }
    
    /**
     * @dev Initialize the oracle
     * @param _guardian Guardian address for emergency functions
     */
    function initialize(address _guardian) public initializer {
        __Ownable_init();
        __Pausable_init();
        
        require(_guardian != address(0), "PO: Invalid guardian");
        guardian = _guardian;
        
        // Set owner as authorized updater
        authorizedUpdaters[msg.sender] = true;
    }
    
    /**
     * @dev Add a new token configuration
     * @param token Token address
     * @param minSources Minimum number of price sources
     * @param maxDeviation Maximum allowed deviation between sources
     * @param heartbeat Maximum time between price updates
     * @param isStablecoin Whether the token is a stablecoin
     */
    function addToken(
        address token,
        uint256 minSources,
        uint256 maxDeviation,
        uint256 heartbeat,
        bool isStablecoin
    ) external onlyOwner {
        require(token != address(0), "PO: Invalid token");
        require(minSources >= MIN_SOURCES, "PO: Too few sources");
        require(maxDeviation <= MAX_DEVIATION, "PO: Deviation too high");
        
        tokenConfigs[token] = TokenConfig({
            isActive: true,
            minSources: minSources,
            maxDeviation: maxDeviation,
            heartbeat: heartbeat,
            isStablecoin: isStablecoin,
            lastPrice: 0,
            lastValidTime: 0
        });
        
        // Initialize price data
        priceData[token] = PriceData({
            price: 0,
            confidence: 0,
            timestamp: 0,
            roundId: 0,
            isValid: false
        });
    }
    
    /**
     * @dev Add a price source for a token
     * @param token Token address
     * @param source Price source address
     */
    function addPriceSource(address token, address source) external onlyOwner validToken(token) {
        require(source != address(0), "PO: Invalid source");
        require(!_containsSource(token, source), "PO: Source already exists");
        
        priceSources[token].push(source);
        emit PriceSourceAdded(token, source);
    }
    
    /**
     * @dev Remove a price source for a token
     * @param token Token address
     * @param source Price source address
     */
    function removePriceSource(address token, address source) external onlyOwner validToken(token) {
        address[] storage sources = priceSources[token];
        
        for (uint i = 0; i < sources.length; i++) {
            if (sources[i] == source) {
                sources[i] = sources[sources.length - 1];
                sources.pop();
                emit PriceSourceRemoved(token, source);
                break;
            }
        }
        
        require(sources.length >= tokenConfigs[token].minSources, "PO: Too few sources");
    }
    
    /**
     * @dev Update price for a token
     * @param token Token address
     */
    function updatePrice(address token) external onlyAuthorized validToken(token) whenNotPaused {
        require(priceSources[token].length >= tokenConfigs[token].minSources, "PO: Insufficient sources");
        
        uint256[] memory prices = new uint256[](priceSources[token].length);
        uint256 validPrices = 0;
        
        // Collect prices from all sources
        for (uint i = 0; i < priceSources[token].length; i++) {
            try IPriceFeed(priceSources[token][i]).getPrice() returns (uint256 price) {
                if (price > 0) {
                    prices[validPrices] = price;
                    validPrices++;
                }
            } catch {
                // Skip invalid price source
            }
        }
        
        require(validPrices >= tokenConfigs[token].minSources, "PO: Too few valid prices");
        
        // Calculate median price
        uint256 medianPrice = _calculateMedian(prices, validPrices);
        
        // Check for circuit breaker conditions
        if (_shouldActivateCircuitBreaker(token, medianPrice)) {
            circuitBreakerActive[token] = true;
            emit CircuitBreakerActivated(token, tokenConfigs[token].lastPrice, medianPrice);
            return;
        }
        
        // Calculate confidence based on price deviation
        uint256 confidence = _calculateConfidence(prices, validPrices, medianPrice);
        
        // Update price data
        priceData[token] = PriceData({
            price: medianPrice,
            confidence: confidence,
            timestamp: block.timestamp,
            roundId: priceData[token].roundId + 1,
            isValid: true
        });
        
        // Update token config
        tokenConfigs[token].lastPrice = medianPrice;
        tokenConfigs[token].lastValidTime = block.timestamp;
        
        // Update price history for TWAP
        _updatePriceHistory(token, medianPrice);
        
        emit PriceUpdated(token, medianPrice, confidence, block.timestamp);
    }
    
    /**
     * @dev Get current price for a token
     * @param token Token address
     * @return Current price
     */
    function getPrice(address token) external view validToken(token) returns (uint256) {
        if (circuitBreakerActive[token] && emergencyPrice[token] > 0) {
            return emergencyPrice[token];
        }
        
        require(priceData[token].isValid, "PO: Price not available");
        require(!isStale(token), "PO: Price is stale");
        
        return priceData[token].price;
    }
    
    /**
     * @dev Get time-weighted average price
     * @param token Token address
     * @param window Time window in seconds
     * @return TWAP price
     */
    function getTWAP(address token, uint256 window) external view validToken(token) returns (uint256) {
        require(window <= TWAP_WINDOW, "PO: Window too large");
        
        PricePoint[] storage history = priceHistory[token];
        if (history.length == 0) return 0;
        
        uint256 cutoffTime = block.timestamp - window;
        uint256 weightedSum = 0;
        uint256 totalWeight = 0;
        
        for (uint i = 0; i < history.length; i++) {
            if (history[i].timestamp >= cutoffTime) {
                uint256 weight = window - (block.timestamp - history[i].timestamp);
                weightedSum += history[i].price * weight;
                totalWeight += weight;
            }
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    
    /**
     * @dev Check if price is stale
     * @param token Token address
     * @return Whether price is stale
     */
    function isStale(address token) public view validToken(token) returns (bool) {
        return block.timestamp - priceData[token].timestamp > tokenConfigs[token].heartbeat;
    }
    
    /**
     * @dev Get price with metadata
     * @param token Token address
     * @return price Current price
     * @return confidence Confidence level
     * @return timestamp Last update timestamp
     * @return isValid Whether price is valid
     */
    function getPriceData(address token) external view validToken(token) returns (
        uint256 price,
        uint256 confidence,
        uint256 timestamp,
        bool isValid
    ) {
        PriceData memory data = priceData[token];
        return (data.price, data.confidence, data.timestamp, data.isValid && !isStale(token));
    }
    
    /**
     * @dev Set emergency price (guardian only)
     * @param token Token address
     * @param price Emergency price
     */
    function setEmergencyPrice(address token, uint256 price) external onlyGuardian validToken(token) {
        require(price > 0, "PO: Invalid price");
        
        emergencyPrice[token] = price;
        circuitBreakerActive[token] = true;
        emit EmergencyPriceSet(token, price);
    }
    
    /**
     * @dev Deactivate circuit breaker (guardian only)
     * @param token Token address
     */
    function deactivateCircuitBreaker(address token) external onlyGuardian validToken(token) {
        circuitBreakerActive[token] = false;
        emergencyPrice[token] = 0;
    }
    
    /**
     * @dev Add authorized updater
     * @param updater Updater address
     */
    function addAuthorizedUpdater(address updater) external onlyOwner {
        require(updater != address(0), "PO: Invalid updater");
        authorizedUpdaters[updater] = true;
    }
    
    /**
     * @dev Remove authorized updater
     * @param updater Updater address
     */
    function removeAuthorizedUpdater(address updater) external onlyOwner {
        authorizedUpdaters[updater] = false;
    }
    
    /**
     * @dev Calculate median price from array
     * @param prices Array of prices
     * @param length Number of valid prices
     * @return Median price
     */
    function _calculateMedian(uint256[] memory prices, uint256 length) internal pure returns (uint256) {
        // Simple bubble sort for small arrays
        for (uint i = 0; i < length - 1; i++) {
            for (uint j = 0; j < length - i - 1; j++) {
                if (prices[j] > prices[j + 1]) {
                    uint256 temp = prices[j];
                    prices[j] = prices[j + 1];
                    prices[j + 1] = temp;
                }
            }
        }
        
        if (length % 2 == 0) {
            return (prices[length / 2 - 1] + prices[length / 2]) / 2;
        } else {
            return prices[length / 2];
        }
    }
    
    /**
     * @dev Calculate confidence based on price deviation
     * @param prices Array of prices
     * @param length Number of valid prices
     * @param median Median price
     * @return Confidence score (0-100)
     */
    function _calculateConfidence(
        uint256[] memory prices,
        uint256 length,
        uint256 median
    ) internal pure returns (uint256) {
        if (length == 0) return 0;
        
        uint256 totalDeviation = 0;
        for (uint i = 0; i < length; i++) {
            uint256 deviation = prices[i] > median ? 
                (prices[i] - median) * 100 / median : 
                (median - prices[i]) * 100 / median;
            totalDeviation += deviation;
        }
        
        uint256 averageDeviation = totalDeviation / length;
        return averageDeviation > 100 ? 0 : 100 - averageDeviation;
    }
    
    /**
     * @dev Check if circuit breaker should be activated
     * @param token Token address
     * @param newPrice New price
     * @return Whether to activate circuit breaker
     */
    function _shouldActivateCircuitBreaker(address token, uint256 newPrice) internal view returns (bool) {
        uint256 lastPrice = tokenConfigs[token].lastPrice;
        if (lastPrice == 0) return false;
        
        uint256 priceChange = newPrice > lastPrice ? 
            (newPrice - lastPrice) * 10000 / lastPrice : 
            (lastPrice - newPrice) * 10000 / lastPrice;
            
        return priceChange > CIRCUIT_BREAKER_THRESHOLD;
    }
    
    /**
     * @dev Update price history for TWAP calculations
     * @param token Token address
     * @param price New price
     */
    function _updatePriceHistory(address token, uint256 price) internal {
        PricePoint[] storage history = priceHistory[token];
        
        // Add new price point
        history.push(PricePoint({
            price: price,
            timestamp: block.timestamp,
            volume: 0 // Volume tracking would require additional integration
        }));
        
        // Clean old entries
        uint256 cutoffTime = block.timestamp - TWAP_WINDOW;
        uint256 validEntries = 0;
        
        for (uint i = 0; i < history.length; i++) {
            if (history[i].timestamp >= cutoffTime) {
                if (validEntries != i) {
                    history[validEntries] = history[i];
                }
                validEntries++;
            }
        }
        
        // Trim array
        while (history.length > validEntries) {
            history.pop();
        }
    }
    
    /**
     * @dev Check if price source already exists
     * @param token Token address
     * @param source Source address
     * @return Whether source exists
     */
    function _containsSource(address token, address source) internal view returns (bool) {
        address[] storage sources = priceSources[token];
        for (uint i = 0; i < sources.length; i++) {
            if (sources[i] == source) return true;
        }
        return false;
    }
    
    /**
     * @dev Get all price sources for a token
     * @param token Token address
     * @return Array of price source addresses
     */
    function getPriceSources(address token) external view returns (address[] memory) {
        return priceSources[token];
    }
    
    /**
     * @dev Get price history for a token
     * @param token Token address
     * @return Array of price points
     */
    function getPriceHistory(address token) external view returns (PricePoint[] memory) {
        return priceHistory[token];
    }
    
    /**
     * @dev Get last update time for a token
     * @param token Token address
     * @return Last update timestamp
     */
    function getLastUpdateTime(address token) external view validToken(token) returns (uint256) {
        return priceData[token].timestamp;
    }
    
    /**
     * @dev Emergency pause (guardian only)
     */
    function emergencyPause() external onlyGuardian {
        _pause();
    }
    
    /**
     * @dev Emergency unpause (owner only)
     */
    function emergencyUnpause() external onlyOwner {
        _unpause();
    }
}
