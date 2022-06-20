import { expect } from "chai";
import { BigNumber, Contract, Wallet } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20";
import { expectStake, mineNBlocks, expectClaim } from '../common.setup';

const createFixtureLoader = waffle.createFixtureLoader;

export async function shouldBehaveLikeClaim(): Promise<void> {
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
    
    
    await pilot.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.mint(wallet.address, parseUnits("2000000", "18"));
    
    await WETH.transfer(staking.address, parseUnits("100", "18")); // 100 WETH
    await staking.updateRewards(parseUnits("100", "18"), "3000"); // 100 WETH
    
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

  describe("#Claim", () => {
    it("should return 0", async () => {
      const result = await staking.totalPilotStaked();
      expect(result).to.equal("0");
    });
    it("should periodically stake twice and claim", async () => {
      let TEN = parseUnits("10", "18");
      await mineNBlocks(20);

      let stake1 = await staking.connect(alice).stake(TEN);
      expectStake(staking, stake1, alice, TEN, "0");
      await mineNBlocks(20);
      
      let stake2 = await staking.connect(alice).stake(TEN);
      expectStake(staking, stake2, alice, TEN, "699999999999999990");
      await mineNBlocks(10);    

      let claimed = await staking.connect(alice).claim();
      expectClaim(staking, claimed, alice, "366666666666666660");

    });
    //NOTICE: this case is only possible if the updateReward and last stake/unstake/claim are in the same block
    //        because these four functions update the lastUpdateBlock
    it('should revert on claim for contract out ot funds', async () => {
      let HundredWETH = parseUnits("100", "18");

      await staking.updateRewards(HundredWETH, "3");
      let stake1 = await staking.connect(alice).stake(HundredWETH)
      expectStake(staking, stake1, alice, HundredWETH, "0");
      
      await mineNBlocks(3300);
      await expect(staking.connect(alice).claim()).to.be.revertedWith('InsufficientFunds');
    })
    xit('should work with multiple user deposit and calculate same reward for all', async () => {
      let HundredWETH = parseUnits("100", "18");
      await WETH.transfer(staking.address, HundredWETH);
      await staking.updateRewards(HundredWETH, "3000");

      await staking.connect(alice).stake(HundredWETH)
      await staking.connect(bob).stake(HundredWETH)
      await staking.connect(carol).stake(HundredWETH)

      await mineNBlocks(20);
      let alicePendingReward = await staking.calculatePendingRewards(alice.address);
      let bobPendingReward = await staking.calculatePendingRewards(bob.address);
      let carolPendingReward = await staking.calculatePendingRewards(carol.address);
      expect(alicePendingReward).to.equal(bobPendingReward).to.equal(carolPendingReward)

    })
  });
}
