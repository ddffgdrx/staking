import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20";
import { mineNBlocks, TX_TYPE, expectEventForAll } from "../common.setup";

const createFixtureLoader = waffle.createFixtureLoader;

export async function shouldBehaveLikeGovernance(): Promise<void> {
  let staking: UnipilotStaking;
  let pilot: TestERC20;
  let WETH: TestERC20;
  let HUNDRED = parseUnits("100", "18");
  let TEN = parseUnits("10", "18");
  let ONE = parseUnits("1", "18");
  let SECONDARY_TOKEN: TestERC20;
  let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  let loadFixture: ReturnType<typeof createFixtureLoader>;

  const [wallet, alice, bob, carol, newWallet] = waffle.provider.getWallets();

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet]);
    const secondaryReward = await ethers.getContractFactory("TestERC20");
    SECONDARY_TOKEN = (await secondaryReward.deploy(1)) as TestERC20;
  });
  beforeEach("fixtures", async () => {
    const res = await loadFixture(stakingConfigFixture);
    staking = res.staking;
    pilot = res.pilot;
    WETH = res.WETH;

    await pilot.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.mint(wallet.address, parseUnits("2000000", "18"));

    await WETH.transfer(staking.address, HUNDRED);
    await staking.updateRewards(HUNDRED, "3000");
    await pilot.connect(wallet).approve(staking.address, MaxUint256);
    await WETH.connect(wallet).approve(staking.address, MaxUint256);

    await pilot.connect(alice).mint(alice.address, parseUnits("2000000", "18"));
    await pilot.connect(bob).mint(bob.address, parseUnits("2000000", "18"));
    await pilot.connect(carol).mint(carol.address, parseUnits("2000000", "18"));

    await pilot.connect(alice).approve(staking.address, MaxUint256);
    await pilot.connect(bob).approve(staking.address, MaxUint256);
    await pilot.connect(carol).approve(staking.address, MaxUint256);
  });
  describe("#RewardAndGovernance", () => {
    it("should return 0", async () => {
      const result = await staking.totalPilotStaked();
      expect(result).to.equal("0");
    });
    it("should let the governanec to change", async () => {
      console.log("new", newWallet.address);
      let newGovernance = staking.setGovernance(newWallet.address);
      await expect(newGovernance).to.not.reverted;
      let resolvedNewGovernance = await newGovernance;

      await expect(resolvedNewGovernance)
        .to.emit(staking, "GovernanceChanged")
        .withArgs(wallet.address, newWallet.address);

      await staking.connect(newWallet).setGovernance(wallet.address);
    });
    it("should not let the governance to change on zero address and non-governance call", async () => {
      await expect(staking.connect(newWallet).setGovernance(newWallet.address)).to.be.revertedWith(
        "CallerNotGovernance",
      );

      await expect(staking.setGovernance(ZERO_ADDRESS)).to.be.revertedWith("ZeroAddress");
    });
    it("sohuld let stakes from users and update reward token with 0 reward to claim", async () => {
      let aliceStake = await staking.connect(alice).stake(TEN);
      let bobStake = await staking.connect(bob).stake(TEN);

      //rewardPeriod ended here
      await staking.updateRewardEndBlock(0);
      let tokenUpdate = await staking.updateRewardToken(SECONDARY_TOKEN.address);
      await staking.updateRewards(100, 100);

      await mineNBlocks(8); //mining only 8 blocks bcz 2 blocks were mined during the above tx
      await ethers.provider.send("evm_setAutomine", [false]);
      let aliceClaim = await staking.connect(alice).claim();
      let bobClaim = await staking.connect(bob).claim();
      await ethers.provider.send("evm_setAutomine", [true]);
      /**
       * acc = 0.5
       * reward/block = 1
       * blocks passed = 11
       */
      expect(tokenUpdate).to.emit(staking, "RewardTokenChanged").withArgs(WETH.address, SECONDARY_TOKEN.address);
      expectEventForAll(staking, aliceClaim, alice, TEN, "5500000000000000000", TX_TYPE.CLAIM);
      expectEventForAll(staking, bobClaim, bob, TEN, "5500000000000000000", TX_TYPE.CLAIM);
    });
    it("should end the period of staking", async () => {
      await staking.updateRewardEndBlock(0);
      await expect(staking.connect(alice).stake(ONE)).to.be.revertedWith("RewardDistributionPeriodHasExpired");
    });
    it("should halt the staking and let to resume again", async () => {
      await staking.updateRewardEndBlock(0);
      await expect(staking.connect(alice).stake(ONE)).to.be.revertedWith("RewardDistributionPeriodHasExpired");
      await staking.updateRewardEndBlock(100);

      let aliceStake = await staking.connect(alice).stake(ONE);
      expectEventForAll(staking, aliceStake, alice, ONE, 0, TX_TYPE.STAKE);
    });
  });
}
