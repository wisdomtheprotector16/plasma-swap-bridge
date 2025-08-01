// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockBridge {
    event BridgeOut(address indexed token, uint256 amount, address indexed recipient, uint256 indexed destinationChainId);
    event BridgeIn(address indexed token, uint256 amount, address indexed recipient, uint256 indexed sourceChainId);

    function bridgeOut(address token, uint256 amount, address recipient, uint256 destinationChainId) external payable {
        emit BridgeOut(token, amount, recipient, destinationChainId);
    }

    function bridgeIn(address token, uint256 amount, address recipient, uint256 sourceChainId) external {
        emit BridgeIn(token, amount, recipient, sourceChainId);
    }
    
    // Allow the contract to receive ETH
    receive() external payable {
        // Accept ETH
    }
}
