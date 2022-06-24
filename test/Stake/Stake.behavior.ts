import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20";
import { mineNBlocks, TX_TYPE, expectEventForAll } from "../common.setup";

const createFixtureLoader = waffle.createFixtureLoader;

export async function shouldBehaveLikeStake(): Promise<void> {
  let staking: UnipilotStaking;
  let pilot: TestERC20;
  let WETH: TestERC20;

  const [wallet, alice, bob, carol] = waffle.provider.getWallets();

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
    await staking.updateRewards(100, "3000");

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
      await expect(staking.connect(wallet).stake(0)).to.be.revertedWith("ZeroInput");
    });

    it("should deposit 100 rewards for 3000 blocks and stake and claim periodically", async () => {
      let HundredWETH = parseUnits("100", "18");

      //get rewardPerBlock
      expect(await staking.currentRewardPerBlock()).to.equal(HundredWETH.div(3000));

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
      expectEventForAll(staking, claimed, alice, HundredWETH, "366666666666666600", TX_TYPE.CLAIM);

      await mineNBlocks(1);
      let claim2 = await staking.connect(alice).claim();
      expectEventForAll(staking, claim2, alice, HundredWETH, "66666666666666600", TX_TYPE.CLAIM);

      await mineNBlocks(1);
      let claim3 = await staking.connect(alice).claim();
      expectEventForAll(staking, claim3, alice, HundredWETH, "66666666666666600", TX_TYPE.CLAIM);
    });

    // NOTICE: this has to fix on contract level to only view reward.
    xit("should stake more and more view the accumulate reward so far", async () => {
      let HundredWETH = parseUnits("100", "18");
      let ONE = parseUnits("1", "18");

      let stake1 = await staking.connect(alice).stake(ONE);
      expectEventForAll(staking, stake1, alice, ONE, "0", TX_TYPE.STAKE);
      await mineNBlocks(20);

      let stake2 = await staking.connect(alice).stake(ONE);
      expectEventForAll(staking, stake2, alice, ONE, "699999999999999993", TX_TYPE.STAKE);
      await mineNBlocks(10);
      let alicePendingReward = await staking.calculatePendingRewards(alice.address);
      console.log("alicePendingReward:", alicePendingReward); //1033333333333333323
    });

    it("should not stake after rewardDistribution end", async () => {
      let HundredWETH = parseUnits("100", "18");
      // await WETH.connect(wallet).transfer(staking.address, HundredWETH);
      // await staking.connect(wallet).updateRewards(100, "3");
      await mineNBlocks(4000);
      await expect(staking.connect(alice).stake(HundredWETH)).to.be.revertedWith("RewardDistributionPeriodHasExpired");
    });

    it("basic single user calculation to check contract works as expected", async () => {
      await mineNBlocks(3000);

      const blncBefore = await WETH.balanceOf(wallet.address);
      const blocksPassed = 10;

      await ethers.provider.send("evm_setAutomine", [false]);
      await staking.updateRewards(10, 10);
      await staking.stake(parseUnits("10", "18"));

      /// hardhat don't allow wallet switching if you use evm_setAutomine
      await ethers.provider.send("evm_setAutomine", [true]);
      await mineNBlocks(blocksPassed);
      const perBlockReward = await staking.currentRewardPerBlock();

      await staking.unstake(parseUnits("10", "18"));
      const blncAfter = await WETH.balanceOf(wallet.address);

      expect(blncBefore).to.be.eq(blncAfter.sub(perBlockReward.mul(blocksPassed)));
    });

    it("two user accumulation calculation", async () => {
      await mineNBlocks(3000);

      let blocksPassed = 10;

      await ethers.provider.send("evm_setAutomine", [false]);

      await staking.updateRewards(30, 30);
      await staking.stake(parseUnits("100", "18"));

      await ethers.provider.send("evm_setAutomine", [true]);

      mineNBlocks(blocksPassed);

      /**
       * User 1 Accumulated reward upto 10 block will be now: 1*10 = 10 (AccumuatedUser1Reward)
       * Now On block 10, User 2 deposits 400 tokens
       *
       * Now on block 15 User 1 is harvesting its rewards.
       * While they got 100% rewards from blocks 0 to 10 i.e 10
       */

      await ethers.provider.send("evm_setAutomine", [false]);
      await staking.connect(alice).stake(parseUnits("400", "18"));

      await ethers.provider.send("evm_setAutomine", [true]);
      blocksPassed = 5;

      mineNBlocks(blocksPassed);

      /**
       * User 1 share from From Block 10 to 15:
       * user1Share = 100/500 => 1/5
       *
       * user2Share = 400/500 => 4/5
       *
       * user1AccumulatedReward = (5 * 1/5) + 10 => 11
       *
       * user2AccumulatedReward = (5 * 4/5) => 4
       *
       * user1 should harvests 11 and user1AccumulatedRewards resets to 0.
       * user2 has accumulated 4 for these last 5 blocks.
       */

      let user1BalanceBefore = await WETH.balanceOf(wallet.address);
      let user1PendingRewards = await staking.calculatePendingRewards(wallet.address);
      await staking.claim();
      let user1BalanceAfter = await WETH.balanceOf(wallet.address);

      // pendingRewards is not equal to user balance because hardhat not including both txs in single block
      expect(user1PendingRewards.add("200000000000000000")).to.be.eq(user1BalanceAfter.sub(user1BalanceBefore));

      blocksPassed = 10;
      mineNBlocks(blocksPassed);

      /**
       * Then 10 more blocks pass and user2 decides to harvest as well.
       * From Block 15 to 25:
       *
       * user1AccumulatedReward = (10 * 1/5) = > 2
       *
       * user2AccumulatedReward = (10 * 4/5) + 4 => 12
       *
       * User2 harvests 12 and StakerBAccumulatedRewards resets to 0.
       */

      await ethers.provider.send("evm_setIntervalMining", [5000]);

      const user2BalanceBefore = await WETH.balanceOf(alice.address);
      const user2PendingRewards = await staking.calculatePendingRewards(alice.address);
      await staking.connect(alice).claim();
      const user2BalanceAfter = await WETH.balanceOf(alice.address);

      // pendingRewards is not equal to user balance because hardhat not including both txs in single block
      expect(user2PendingRewards.add("800000000000000000")).to.be.eq(user2BalanceAfter.sub(user2BalanceBefore));
    });
  });
}
