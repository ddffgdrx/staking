// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IUnipilotStaking {
    function stake(uint256 amount) external;

    function unstake(uint256 amount) external;

    function claim() external;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);


}
