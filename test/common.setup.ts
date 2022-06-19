import { ethers } from "hardhat";
import { ContractTransaction, Wallet } from "ethers";
import { expect } from "chai";
import { UnipilotStaking } from "../typechain/UnipilotStaking.d";
import { BigNumber } from "ethers";
import { loadFixture } from "ethereum-waffle";
import { stakingConfigFixture } from "./shared/fixtures";

export const mineNBlocks = async (n: number): Promise<number> => {
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  if (ethers) console.log(true);
  const currentBlockNumber = await ethers.provider.getBlockNumber();
  return currentBlockNumber;
  // console.log("currentBlockNumber: ", currentBlockNumber);
};
export const expectStake = (
  staking: UnipilotStaking,
  variable: ContractTransaction,
  user: Wallet,
  amount: string | BigNumber | number,
  pendingRewards: string | BigNumber | number
) =>
  expect(variable)
    .to.emit(staking, "Stake")
    .withArgs(user.address, amount, pendingRewards);

export const expectClaim = (
  staking: UnipilotStaking,
  variable: ContractTransaction,
  user: Wallet,
  pendingRewards: string | BigNumber | number
) =>
  expect(variable)
    .to.emit(staking, "Claim")
    .withArgs(user.address, pendingRewards);

export const expectUnstake = (
  staking: UnipilotStaking,
  variable: ContractTransaction,
  user: Wallet,
  amount: string | BigNumber | number,
  pendingRewards: string | BigNumber | number,
  isEmergency?: boolean
) =>
  expect(variable)
    .to.emit(staking, "Claim")
    .withArgs(user.address, amount, pendingRewards, isEmergency);
