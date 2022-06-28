import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20";
import { mineNBlocks, TX_TYPE, expectEventForAll } from "../common.setup";
import { TestERC206D } from "../../typechain";

const createFixtureLoader = waffle.createFixtureLoader;

export async function shouldBehaveLikeDecimalInput(): Promise<void> {
  let staking: UnipilotStaking;
  let pilot: TestERC20;
  let WETH: TestERC20;
  let WETH6D: TestERC206D;
  let HUNDRED = parseUnits("100", "18");
  let TEN = parseUnits("10", "18");
  let ONE = parseUnits("1", "18");
  let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  let loadFixture: ReturnType<typeof createFixtureLoader>;

  const [wallet, alice, bob, carol, newWallet] = waffle.provider.getWallets();

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet]);
  });
  beforeEach("fixtures", async () => {
    const res = await loadFixture(stakingConfigFixture);
    staking = res.staking;
    pilot = res.pilot;
    WETH = res.WETH;
    WETH6D = res.WETH6D;

    await pilot.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH6D.mint(wallet.address, parseUnits("2000000", "18"));

    await WETH.transfer(staking.address, HUNDRED);
    await WETH6D.transfer(staking.address, HUNDRED);

    await pilot.approve(staking.address, MaxUint256);
    await WETH.approve(staking.address, MaxUint256);

    await pilot.connect(alice).mint(alice.address, parseUnits("2000000", "18"));
    await pilot.connect(alice).approve(staking.address, MaxUint256);
  });
  describe("#RewardAndGovernance", () => {
    it("should monitor for wei input in 18 decimals token", async () => {
      // 18 decimals token working
      await staking.updateRewards(parseUnits("0.5", "18"), 100);
      await expect(staking.connect(alice).stake(alice.address, TEN))
        .to.emit(staking, "StakeOrUnstakeOrClaim")
        .withArgs(alice.address, TEN, "0", TX_TYPE.STAKE);
      await mineNBlocks(40);

      let alicePendingsIn18Decimals = await staking.calculatePendingRewards(alice.address);
      let fortyBlocksReward = parseUnits("0.5", "18").div(100).mul(40); //rewards * noOfBlocks * blocks passed
      expect(fortyBlocksReward).to.eq(alicePendingsIn18Decimals);
      await staking.connect(alice).emergencyUnstake();
      await mineNBlocks(60);

      // 6 decimals token working
      await staking.updateRewardToken(WETH6D.address);
      await staking.updateRewards(parseUnits("0.5", "18"), 100);
      await expect(staking.connect(alice).stake(alice.address, TEN))
        .to.emit(staking, "StakeOrUnstakeOrClaim")
        .withArgs(alice.address, TEN, "0", TX_TYPE.STAKE);
      await mineNBlocks(40);
      let alicePendingsIn6Decimals = await staking.calculatePendingRewards(alice.address);
      fortyBlocksReward = parseUnits("0.5", "18")
        .div(100)
        .mul(40)
        .div(1 * 10 ** 12); // ( rewards * noOfBlocks * blocks passed) / token decimals
      expect(fortyBlocksReward).to.eq(alicePendingsIn6Decimals);
    });
  });
}
