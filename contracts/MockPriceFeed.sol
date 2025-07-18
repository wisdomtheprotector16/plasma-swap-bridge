// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPriceFeed {
    uint256 public price;
    uint256 public lastUpdateTime;
    bool public healthy;
    
    constructor() {
        price = 1e18; // Default price of 1 USD
        lastUpdateTime = block.timestamp;
        healthy = true;
    }
    
    function getPrice() external view returns (uint256) {
        return price;
    }
    
    function getLastUpdateTime() external view returns (uint256) {
        return lastUpdateTime;
    }
    
    function isHealthy() external view returns (bool) {
        return healthy;
    }
    
    // Admin functions for testing
    function setPrice(uint256 _price) external {
        price = _price;
        lastUpdateTime = block.timestamp;
    }
    
    function setHealthy(bool _healthy) external {
        healthy = _healthy;
    }
}
