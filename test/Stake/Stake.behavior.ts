import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20";

const createFixtureLoader = waffle.createFixtureLoader;

const mineNBlocks = async (n: number): Promise<number> => {
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine", []);
  }
  const currentBlockNumber = await ethers.provider.getBlockNumber();
  return currentBlockNumber
  // console.log("currentBlockNumber: ", currentBlockNumber);
};

export async function shouldBehaveLikeStake(): Promise<void> {
  let staking: UnipilotStaking;
  let pilot: TestERC20;
  let WETH: TestERC20;

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] = waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet, other]);
  });
  beforeEach("fixtures", async () => {
    const res = await loadFixture(stakingConfigFixture);
    staking = res.staking;
    pilot = res.pilot;
    WETH = res.WETH;

    await pilot.connect(wallet).mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.connect(wallet).mint(wallet.address, parseUnits("2000000", "18"));

    await pilot.connect(alice).mint(alice.address, parseUnits("2000000", "18"));
    await WETH.connect(alice).mint(alice.address, parseUnits("2000000", "18"));

    await pilot.connect(bob).mint(bob.address, parseUnits("2000000", "18"));
    await WETH.connect(bob).mint(bob.address, parseUnits("2000000", "18"));

    await pilot.connect(carol).mint(carol.address, parseUnits("2000000", "18"));
    await WETH.connect(carol).mint(carol.address, parseUnits("2000000", "18"));

    await pilot.connect(user0).mint(user0.address, parseUnits("2000000", "18"));
    await WETH.connect(user0).mint(user0.address, parseUnits("2000000", "18"));

    await pilot.connect(wallet).approve(staking.address, MaxUint256);
    await WETH.connect(wallet).approve(staking.address, MaxUint256);

    await pilot.connect(alice).approve(staking.address, MaxUint256);
    await WETH.connect(alice).approve(staking.address, MaxUint256);

    await pilot.connect(bob).approve(staking.address, MaxUint256);
    await WETH.connect(bob).approve(staking.address, MaxUint256);

    await pilot.connect(carol).approve(staking.address, MaxUint256);
    await WETH.connect(carol).approve(staking.address, MaxUint256);

    await pilot.connect(user0).approve(staking.address, MaxUint256);
    await WETH.connect(user0).approve(staking.address, MaxUint256);
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
    it("should deposit 100 rewards for 3000 blocks", async () => {
      let HundredWETH = parseUnits("100", "18");
      //transfer 100 weth from wallet to staking contract
      await WETH.transfer(staking.address, HundredWETH);
      await staking.updateRewards(HundredWETH, "3000");

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
       * acc = ((11 * (hundred/3000)) * one) / hundred = 3666666666666666
       * pending = ((3666666666666666 * hundred) / one)- 0 = 366666666666666600
       */
      expect(claimed).to.emit(staking, "Claim").withArgs(alice.address, "366666666666666600");
      
      await mineNBlocks(1);
      let claim2 = await staking.connect(alice).claim();
      expect(claim2).to.emit(staking, "Claim").withArgs(alice.address, "66666666666666600"); //b# (39-37)
      
      await mineNBlocks(1);
      let claim3 = await staking.connect(alice).claim();
      expect(claim3).to.emit(staking, "Claim").withArgs(alice.address, "66666666666666600"); //b# (41-39)
    });
    xit("should stake more and watch the accumulate reward so far", async () => {
      let HundredWETH = parseUnits("100", "18");
      // 33.333 reward per block
      await WETH.connect(wallet).transfer(staking.address, HundredWETH);
      await staking.connect(wallet).updateRewards(HundredWETH, "3000");
      await mineNBlocks(20);

      await staking.connect(alice).stake(HundredWETH);
      await mineNBlocks(20);
      await staking.connect(alice).stake(HundredWETH);
      await mineNBlocks(10);
      //view calculatePendingRewards
      let alicePendingReward = await staking.calculatePendingRewards(
        alice.address
      );
      console.log("alicePendingReward:", alicePendingReward);//0.6n66
    });
    xit('should not stake after rewardDistribution end', async () => {
      let HundredWETH = parseUnits("100", "18");
      // 33.333 reward per block
      await WETH.connect(wallet).transfer(staking.address, HundredWETH);
      await staking.connect(wallet).updateRewards(HundredWETH, "3");
      await mineNBlocks(20);
      // await staking.connect(alice).stake(HundredWETH).to.be.revertedWith;

    })
  });
}
