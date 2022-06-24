import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20";
import { mineNBlocks, TX_TYPE, expectEventForAll } from "../common.setup";

const createFixtureLoader = waffle.createFixtureLoader;

export async function shouldBehaveLikeViewRewards(): Promise<void> {
  let staking: UnipilotStaking;
  let pilot: TestERC20;
  let WETH: TestERC20;

  const [wallet, alice, bob] = waffle.provider.getWallets();

  let ONE = parseUnits("1", "18");
  let TEN = parseUnits("10", "18");
  let HUNDRED = parseUnits("100", "18");

  let loadFixture: ReturnType<typeof createFixtureLoader>;

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet]);
  });
  beforeEach("fixtures", async () => {
    const res = await loadFixture(stakingConfigFixture);
    staking = res.staking;
    pilot = res.pilot;
    WETH = res.WETH;

    await pilot.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.mint(wallet.address, parseUnits("2000000", "18"));

    await WETH.transfer(staking.address, HUNDRED);
    await staking.updateRewards(100, 100);
    // console.log(await ethers.provider.getBlockNumber())

    await pilot.connect(alice).mint(alice.address, parseUnits("2000000", "18"));
    await pilot.connect(bob).mint(bob.address, parseUnits("2000000", "18"));

    await pilot.connect(alice).approve(staking.address, MaxUint256);
    await pilot.connect(bob).approve(staking.address, MaxUint256);
  });
  describe("#RewardsLookup", () => {
    it("should view reward/block", async () => {
      const result = await staking.currentRewardPerBlock();
      expect(result).to.equal(HUNDRED.div("100"));
    });
    it("should stake 10 tokens and after 10 blocks, see rewards", async () => {
      let aliceStake = await staking.connect(alice).stake(TEN);
      expectEventForAll(staking, aliceStake, alice, TEN, 0, TX_TYPE.STAKE);
      await mineNBlocks(10);
      let aliceReward = await staking.calculatePendingRewards(alice.address);
      expect(aliceReward).to.equal(TEN);
    });
    it("2 users stake at same time, one view for 10 blocks, 2nd view for 20 blocks, should be double", async () => {
      await ethers.provider.send("evm_setAutomine", [false]);
      let aliceStake = await staking.connect(alice).stake(TEN); //block number = 16
      let bobStake = await staking.connect(bob).stake(TEN); //block number = 16
      await ethers.provider.send("evm_setAutomine", [true]);

      await mineNBlocks(10);
      let aliceReward = await staking.calculatePendingRewards(alice.address);
      await mineNBlocks(10);
      let bobReward = await staking.calculatePendingRewards(bob.address);

      expectEventForAll(staking, aliceStake, alice, TEN, 0, TX_TYPE.STAKE);
      expectEventForAll(staking, bobStake, bob, TEN, 0, TX_TYPE.STAKE);
      expect(aliceReward).to.equal("4500000000000000000"); //4.5
      expect(bobReward).to.equal("9500000000000000000"); //9.5
    });
    it("should stake and claim all reward, then only view the reward for 1 block", async () => {
      let aliceStake = await staking.connect(alice).stake(TEN);
      await mineNBlocks(10);
      let aliceClaim = await staking.connect(alice).claim();
      let aliceVieww = await staking.calculatePendingRewards(alice.address);

      expectEventForAll(staking, aliceStake, alice, TEN, 0, TX_TYPE.STAKE);
      expectEventForAll(staking, aliceClaim, alice, TEN, TEN.add(ONE), TX_TYPE.CLAIM);
      // console.log("alice view reward", aliceVieww.toString());
      expect(aliceVieww).to.equal(0);
    });
    //NOTICE: this test is not working, it's a bug in the automine,
    //it doesn't revert the pending transactions after confirmation
    it("should prevent double claim", async () => {
      let aliceStake = await staking.connect(alice).stake(TEN);
      await ethers.provider.send("evm_setAutomine", [false]);
      let claim1 = await staking.connect(alice).claim();
      let claim2 = await staking.connect(alice).claim();
      await ethers.provider.send("evm_setAutomine", [true]);
      await mineNBlocks(1);
      expectEventForAll(staking, claim1, alice, TEN, ONE, TX_TYPE.CLAIM);
      // expectEventForAll(staking, claim1, alice, TEN, ONE, TX_TYPE.CLAIM)
    });
  });
}
