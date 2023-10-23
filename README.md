# Zido Staking

This repository contains UnixproZidotocol staking smart contract.

## ZidoStaking.sol
`ZidoStaking.sol` allows ZIDO holders to stake (`stake()`) ZIDO tokens to receive rewards (reward token could be WETH or any other ERC-20 token). Staker can claim rewards (`claim()`). Stakers may unstake their ZIDO tokens by calling `unstake()`, which will trigger the reward claim as well. For emergency unstake, stakers can call `emergencyUnstake()`, beaware that emergency unstake doesn't trigger reward claim and all your pending reward tokens are lost.

## Local deployment

### Pre Requisite

After cloning the repository, make sure to install dependencies:

```
$ yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```
$ yarn compile
```


Set the environment variables.
For example:

```
INFURA_API_KEY="Your infura API key"
PK1="Your private key"
ETHERSCAN_API_KEY="Your etherscan API key"
```

Execute the tasks in the following order with correct params to deploy zido staking contract and to verify it.

```
1. deploy-zido-setup
2. deploy-zido-staking
3. setup-staking-contract
4. verify-zido-staking
```

## Test cases

To run the test cases:
```
$ yarn test
```

## Licensing

Zido staking contract is licensed under the [MIT License](https://opensource.org/licenses/MIT)

