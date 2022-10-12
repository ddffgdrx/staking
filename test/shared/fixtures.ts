import { BigNumber, Wallet } from "ethers";
import { ethers } from "hardhat";
import { deployContract, Fixture } from "ethereum-waffle";
import { TestERC20 } from "../../typechain/TestERC20";
import { waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC206D } from "../../typechain/TestERC206D.d";
interface TokensFixture {
  pilot: TestERC20;
  WETH: TestERC20;
  testToken: TestERC20;
  WETH6D: TestERC206D; //6 decimals token
}

async function tokensFixture(): Promise<TokensFixture> {
  const sixDecimalToken = await ethers.getContractFactory("TestERC206D");
  const tokenFactory = await ethers.getContractFactory("TestERC20");

  const pilot = (await tokenFactory.deploy(BigNumber.from(1).pow(255))) as TestERC20;
  const WETH = (await tokenFactory.deploy(BigNumber.from(1).pow(255))) as TestERC20;
  const testToken = (await tokenFactory.deploy(BigNumber.from(1).pow(255))) as TestERC20;
  const WETH6D = (await sixDecimalToken.deploy(BigNumber.from(1).pow(255))) as TestERC206D; //6 decimals token

  return { pilot, WETH, testToken, WETH6D };
}

interface StakingFixture {
  staking: UnipilotStaking;
}
async function stakingFixture(wallet: Wallet, WETH: TestERC20, pilot: TestERC20): Promise<StakingFixture> {
  const stakingStaking = await ethers.getContractFactory("UnipilotStaking");
  const staking = (await stakingStaking.deploy(wallet.address, WETH.address, pilot.address)) as UnipilotStaking;

  let arr: string[] = ["pilot:", "WETH:", "Governance:", "staking:"];
  // [pilot, WETH, wallet, staking].map((el, i) => console.log(arr[i], el.address));

  return { staking };
}

type TokensAndStakingFixture = StakingFixture & TokensFixture;

export const stakingConfigFixture: Fixture<TokensAndStakingFixture> =
  async function (): Promise<TokensAndStakingFixture> {
    const [wallet] = waffle.provider.getWallets();
    const { pilot, WETH, testToken, WETH6D } = await tokensFixture();
    const { staking } = await stakingFixture(wallet, WETH, pilot);
    return { staking, pilot, WETH, testToken, WETH6D };
  };
