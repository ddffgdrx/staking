import { ethers } from "hardhat";
import { ContractTransaction, Wallet } from "ethers";
import { expect } from "chai";
import { UnipilotStaking } from "../typechain/UnipilotStaking.d";
import { BigNumber } from "ethers";
import { loadFixture } from "ethereum-waffle";
import { stakingConfigFixture } from "./shared/fixtures";

export enum TX_TYPE {
  STAKE,
  UNSTAKE,
  CLAIM,
  EMERGENCY,
}

export const mineNBlocks = async (n: number): Promise<number> => {
  let tempPromises: any = [];
  // for (let i = 0; i < n; i++) {
  //   tempPromises.push(ethers.provider.send("evm_mine", []));
  // }
  // await Promise.all(tempPromises);
  let hexNumber = Number(n).toString(16).toUpperCase();
  await ethers.provider.send("hardhat_mine", [`0x${hexNumber}`]);

  const currentBlockNumber = await ethers.provider.getBlockNumber();
  return currentBlockNumber;
  // console.log("currentBlockNumber: ", currentBlockNumber);
};
export const expectStake = (
  staking: UnipilotStaking,
  variable: ContractTransaction,
  user: Wallet,
  amount: string | BigNumber | number,
  pendingRewards: string | BigNumber | number,
) => expect(variable).to.emit(staking, "Stake").withArgs(user.address, amount, pendingRewards);

export const expectClaim = (
  staking: UnipilotStaking,
  variable: ContractTransaction,
  user: Wallet,
  pendingRewards: string | BigNumber | number,
) => expect(variable).to.emit(staking, "Claim").withArgs(user.address, pendingRewards);

export const expectUnstake = (
  staking: UnipilotStaking,
  variable: ContractTransaction,
  user: Wallet,
  amount: string | BigNumber | number,
  pendingRewards: string | BigNumber | number,
  isEmergency?: boolean,
) => expect(variable).to.emit(staking, "Unstake").withArgs(user.address, amount, pendingRewards, isEmergency);

export const expectEventForAll = (
  staking: UnipilotStaking,
  variable: ContractTransaction | Promise<ContractTransaction>,
  user: Wallet,
  amount: string | BigNumber | number,
  pendingRewards: string | BigNumber | number,
  txType: TX_TYPE,
) => expect(variable).to.emit(staking, "StakeOrUnstakeOrClaim").withArgs(user.address, amount, pendingRewards, txType);

export const delay = async (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
