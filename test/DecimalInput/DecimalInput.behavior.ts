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
    WETH6D = res.WETH6D;

    await pilot.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH6D.mint(wallet.address, parseUnits("2000000", "18"));
    await SECONDARY_TOKEN.mint(wallet.address, parseUnits("2000000", "18"));

    await WETH.transfer(staking.address, HUNDRED);
    await WETH6D.transfer(staking.address, HUNDRED);
    // await staking.updateRewards(100, 100);
    // console.log("start b#", await ethers.provider.getBlockNumber());

    await pilot.connect(wallet).approve(staking.address, MaxUint256);
    await WETH.connect(wallet).approve(staking.address, MaxUint256);
    await SECONDARY_TOKEN.connect(wallet).approve(staking.address, MaxUint256);
    //admin stake
    // await staking.stake(ONE);

    await pilot.connect(alice).mint(alice.address, parseUnits("2000000", "18"));
    await pilot.connect(bob).mint(bob.address, parseUnits("2000000", "18"));
    await pilot.connect(carol).mint(carol.address, parseUnits("2000000", "18"));

    await pilot.connect(alice).approve(staking.address, MaxUint256);
    await pilot.connect(bob).approve(staking.address, MaxUint256);
    await pilot.connect(carol).approve(staking.address, MaxUint256);
  });
  describe("#RewardAndGovernance", () => {
    xit("should return 1 eth", async () => {
      const result = await staking.totalPilotStaked();
      expect(result).to.equal(ONE);
    });

    it("should monitor for wei input in 18 decimals token", async () => {
      await staking.updateRewards(parseUnits("0.5", "18"), 100);
      await staking.connect(alice).stake(alice.address, TEN);
      await mineNBlocks(40);
      console.log("alice pending for 18 decimals", await staking.calculatePendingRewards(alice.address));
      let aliceStake = await staking.connect(alice).claim();
      expectEventForAll(staking, aliceStake, alice, TEN, "205000000000000000", TX_TYPE.CLAIM);
    });
    it("should monitor to for wei input in 6 decimals token", async () => {
      await mineNBlocks(200);
      await staking.updateRewardToken(WETH6D.address);
      await staking.updateRewards(parseUnits("0.5", "18"), 100);
      await staking.connect(alice).stake(alice.address, TEN);
      await mineNBlocks(40);
      console.log("alice pending for 6 decimals", await staking.calculatePendingRewards(alice.address));
      let aliceStake = await staking.connect(alice).claim();
      expectEventForAll(staking, aliceStake, alice, TEN, "205000", TX_TYPE.CLAIM);
    });
  });
}
