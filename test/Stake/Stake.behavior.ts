import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20";
import { mineNBlocks, expectClaim } from '../common.setup';

const createFixtureLoader = waffle.createFixtureLoader;

export async function shouldBehaveLikeStake(): Promise<void> {
  let staking: UnipilotStaking;
  let pilot: TestERC20;
  let WETH: TestERC20;

  const [wallet, alice, bob, carol, ] = waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet]);
  });
  beforeEach("fixtures", async () => {
    const res = await loadFixture(stakingConfigFixture);
    staking = res.staking;
    pilot = res.pilot;
    WETH = res.WETH;

    let HundredWETH = parseUnits("100", "18");

    await pilot.connect(wallet).mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.connect(wallet).mint(wallet.address, parseUnits("2000000", "18"));

    await WETH.transfer(staking.address, HundredWETH);
    await staking.updateRewards(HundredWETH, "3000");

    await pilot.connect(alice).mint(alice.address, parseUnits("2000000", "18"));
    await WETH.connect(alice).mint(alice.address, parseUnits("2000000", "18"));

    await pilot.connect(bob).mint(bob.address, parseUnits("2000000", "18"));
    await WETH.connect(bob).mint(bob.address, parseUnits("2000000", "18"));

    await pilot.connect(carol).mint(carol.address, parseUnits("2000000", "18"));
    await WETH.connect(carol).mint(carol.address, parseUnits("2000000", "18"));

    await pilot.connect(wallet).approve(staking.address, MaxUint256);
    await WETH.connect(wallet).approve(staking.address, MaxUint256);

    await pilot.connect(alice).approve(staking.address, MaxUint256);
    await WETH.connect(alice).approve(staking.address, MaxUint256);

    await pilot.connect(bob).approve(staking.address, MaxUint256);
    await WETH.connect(bob).approve(staking.address, MaxUint256);

    await pilot.connect(carol).approve(staking.address, MaxUint256);
    await WETH.connect(carol).approve(staking.address, MaxUint256);

  });

  describe("#Stake", () => {
    it("should validate governance", async () => {
      const governance = await staking.governance();
      expect(governance).to.equal(wallet.address);
    });
    it("should revert on 0 amount stake", async () => {
      await expect(staking.connect(wallet).stake(0)).to.be.revertedWith(
        "ZeroAmount"
      );
    });
    it("should deposit 100 rewards for 3000 blocks and stake and claim periodically", async () => {
      let HundredWETH = parseUnits("100", "18");

      //get rewardPerBlock
      expect(await staking.currentRewardPerBlock()).to.equal(
        HundredWETH.div(3000)
      );

      //stake 50 pilot from alice
      await staking.connect(alice).stake(HundredWETH);
      await mineNBlocks(10);
      
      let claimed = await staking.connect(alice).claim();
      /**
       * hundred=100000000000000000000
       * one=1000000000000000000
       * reward/block = hundred/3000 = 33333333333333333 
       * acc += ((11 * (hundred/3000)) * one) / hundred = 3666666666666666
       * pending = ((3666666666666666 * hundred) / one)- 0 = 366666666666666600
       */
      expectClaim(staking, claimed, alice, "366666666666666600");
      
      await mineNBlocks(1);
      let claim2 = await staking.connect(alice).claim();
      expectClaim(staking, claim2, alice, "66666666666666600");
      
      await mineNBlocks(1);
      let claim3 = await staking.connect(alice).claim();
      expectClaim(staking, claim3, alice, "66666666666666600");
    });
    // NOTICE: this has to fix on contract level to only view reward.
    xit("should stake more and watch the accumulate reward so far", async () => {
      let HundredWETH = parseUnits("100", "18");
      let ONE  = parseUnits("1", "18");

      await mineNBlocks(20);

      await staking.connect(alice).stake(ONE);
      await mineNBlocks(20);

      await staking.connect(alice).stake(ONE);
      await mineNBlocks(10);

      let alicePendingReward = await staking.calculatePendingRewards(
        alice.address
      );
      console.log("alicePendingReward:", alicePendingReward);//0.6n66
    });
    // NOTICE: not supported yet
    xit('should not stake after rewardDistribution end', async () => {
      let HundredWETH = parseUnits("100", "18");
      await WETH.connect(wallet).transfer(staking.address, HundredWETH);
      await staking.connect(wallet).updateRewards(HundredWETH, "3");
      await mineNBlocks(20);
      // await staking.connect(alice).stake(HundredWETH).to.be.revertedWith;

    })
  });
}
