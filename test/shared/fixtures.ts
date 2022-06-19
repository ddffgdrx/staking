import { BigNumber, Wallet } from "ethers";
import { ethers } from "hardhat";
import { deployContract, Fixture } from "ethereum-waffle";
import { TestERC20 } from "../../typechain/TestERC20";
import { waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";

interface TokensFixture {
  pilot: TestERC20;
  WETH: TestERC20;
}

async function tokensFixture(): Promise<TokensFixture> {
  const tokenFactory = await ethers.getContractFactory("TestERC20");
  const pilot = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20;
  const WETH = (await tokenFactory.deploy(BigNumber.from(2).pow(255))) as TestERC20;

  return { pilot, WETH };
}

interface StakingFixture {
  staking: UnipilotStaking;
}
async function stakingFixture(wallet: Wallet, pilot:TestERC20, WETH:TestERC20): Promise<StakingFixture> {
  const stakingStaking = await ethers.getContractFactory("UnipilotStaking");
  const staking = (await stakingStaking.deploy(pilot.address, WETH.address, wallet.address)) as UnipilotStaking;
  
  let arr:string[] = ["pilot:", "WETH:", "Governance:", "staking:"];
  [pilot, WETH, wallet, staking].map((el, i) => console.log(arr[i],el.address))
  
  return { staking };
}

type TokensAndStakingFixture = StakingFixture & TokensFixture;

export const stakingConfigFixture: Fixture<TokensAndStakingFixture> =
  async function (): Promise<TokensAndStakingFixture> {
    const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] = waffle.provider.getWallets();
    const { pilot, WETH } = await tokensFixture();
    const { staking } = await stakingFixture(wallet, pilot, WETH);
    return { staking, pilot, WETH };
  };
