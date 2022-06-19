import { ethers } from "hardhat";

export const mineNBlocks = async (n: number): Promise<number> => {
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  const currentBlockNumber = await ethers.provider.getBlockNumber();
  return currentBlockNumber
  // console.log("currentBlockNumber: ", currentBlockNumber);
};