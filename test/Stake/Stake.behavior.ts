import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20.d";
// import { Pilot } from "../../typechain";

const createFixtureLoader = waffle.createFixtureLoader;
 
const mineNBlocks = async (n:number) => {
  for(let i = 0; i < n; i++) {
    await ethers.provider.send('evm_mine', []);
  }
  const blockNumBefore = await ethers.provider.getBlockNumber();
  console.log("blockNumBefore: ",blockNumBefore)
}

export async function shouldBehaveLikeStake(): Promise<void> {
  let staking: UnipilotStaking;
  let pilot: TestERC20;
  let WETH: TestERC20;

  type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
  const [wallet, alice, bob, carol, other, user0, user1, user2, user3, user4] =
    waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet, other]);
  });
  beforeEach("fixtures", async () => {
    const res = await loadFixture(stakingConfigFixture);
    staking = res.staking;
    pilot = res.pilot;
    WETH = res.WETH;
    await pilot
      .connect(wallet)
      .mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.connect(wallet).mint(
      wallet.address,
      parseUnits("2000000", "18")
    );

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
    // NOTICE this case is reverting
    it("should deposit 100 rewards for 3 blocks", async () => {
      let HundredWETH = parseUnits("100", "18");
      //transfer 100 weth from wallet to staking contract
      await WETH.connect(wallet).transfer(staking.address, HundredWETH);
      await staking.connect(wallet).updateRewards(HundredWETH, "3");

      //get rewardPerBlock
      expect(await staking.currentRewardPerBlock()).to.equal(
        HundredWETH.div(3)
      );
      // NOTICE: this is getting when updateReward and stake both mine in the same block

      //stake 50 pilot from alice
      await staking.connect(alice).stake(HundredWETH);
      await mineNBlocks(10);
      expect(await staking.connect(alice).claim()).to.emit(
        UnipilotStaking,
        "Claim"
      ); //0.33333 ((1 - 0) * 33.3333 / 100)
      await mineNBlocks(1);
      await staking.connect(alice).claim(); //0.33333
      await mineNBlocks(1);
      await staking.connect(alice).claim(); //0.33333
    });
    xit("should stake more and watch the accumulate reward so far", async () => {
      let HundredWETH = parseUnits("100", "18");
      // 33.333 reward per block
      await WETH.connect(wallet).transfer(staking.address, HundredWETH);
      await staking.connect(wallet).updateRewards(HundredWETH, "3");
      await mineNBlocks(20);

      await staking.connect(alice).stake(HundredWETH);
      await mineNBlocks(20);
      await staking.connect(alice).stake(HundredWETH);
      await mineNBlocks(10);
      //view calculatePendingRewards
      let alicePendingReward = await staking.calculatePendingRewards(
        alice.address
      );
      console.log("alicePendingReward:", alicePendingReward);
    });
  });
}
