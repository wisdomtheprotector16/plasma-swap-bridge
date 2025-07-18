// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPaymaster {
    mapping(address => mapping(address => bool)) public isEligible;
    mapping(address => uint256) public gasTokenPrices;
    
    constructor() {
        // Set default gas token prices
        gasTokenPrices[address(0)] = 1e18; // Default price
    }
    
    function isEligibleForGaslessTransfer(address user, address token) external view returns (bool) {
        return isEligible[user][token];
    }
    
    function validateAndCharge(address user, address token, uint256 gasCost) external {
        require(isEligible[user][token], "Not eligible for gasless transfer");
        // Mock implementation - in real contract this would charge the user
    }
    
    function getGasTokenPrice(address token) external view returns (uint256) {
        return gasTokenPrices[token] > 0 ? gasTokenPrices[token] : 1e18;
    }
    
    // Admin functions for testing
    function setEligible(address user, address token, bool eligible) external {
        isEligible[user][token] = eligible;
    }
    
    function setGasTokenPrice(address token, uint256 price) external {
        gasTokenPrices[token] = price;
    }
}
