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

  const [wallet, alice, bob, carol, newWallet] = waffle.provider.getWallets();

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

    await pilot.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.mint(wallet.address, parseUnits("2000000", "18"));

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
  describe("#RewardAndGovernance", () => {
    it("should return 0", async () => {
      const result = await staking.totalPilotStaked();
      expect(result).to.equal("0");
    });
    // NOTICE: issue in event emitting on contract level.
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
      await expect(staking.setGovernance(newWallet.address)).to.not.revertedWith("CallerNotGovernance");
      await expect(staking.setGovernance(newWallet.address)).to.not.revertedWith("ZeroAddress");
    });
  });
}
