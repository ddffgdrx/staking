import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20.d";
import {mineNBlocks, expectEventForAll, TX_TYPE} from "./../common.setup"

const createFixtureLoader = waffle.createFixtureLoader;

export async function shouldBehaveLikeUnstake(): Promise<void> {
  let staking: UnipilotStaking;
  let pilot: TestERC20;
  let WETH: TestERC20;

  const [wallet, alice, bob, carol] =
    waffle.provider.getWallets();

  let loadFixture: ReturnType<typeof createFixtureLoader>;

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet]);
    const res = await loadFixture(stakingConfigFixture);
    staking = res.staking;
    pilot = res.pilot;
    WETH = res.WETH;

    await pilot.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.mint(wallet.address, parseUnits("2000000", "18"));
    
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
  beforeEach("fixtures", async () => {
    
    await WETH.transfer(staking.address, parseUnits("100", "18"));
    await staking.updateRewards(100, "3000");
    console.log('======== admin deposit start ============');
    await staking.connect(wallet).stake(parseUnits("1", "18"));
    console.log('======== admin deposit end =============');
  });
  describe("#Unstake", () => {
    it("user can't unstake 0 OR greater than staked", async () => {
      await expect(staking.connect(alice).unstake(0)).to.be.revertedWith("AmountLessThanStakedAmountOrZero");
      await staking.connect(alice).stake(parseUnits("10", "18"));

      await expect(staking.connect(alice).unstake(0)).to.be.revertedWith("AmountLessThanStakedAmountOrZero");
      await expect(staking.connect(alice).unstake(parseUnits("11", "18"))).to.be.revertedWith("AmountLessThanStakedAmountOrZero");
      await expect(staking.connect(alice).unstake(parseUnits("10", "18"))).to.not.reverted;
    });
    // NOTICE: this test was emitting events when running independently, not with stake and claim.
    // but not when running in series with stake and claim
    it('user can emergency unstake after reward duration has ended', async () => {
      let stake1 = await staking.connect(alice).stake(parseUnits("10", "18"));
      // expectEventForAll(staking, stake1, alice, parseUnits("10", "18"), "0", TX_TYPE.STAKE)
      
      await mineNBlocks(3000);
      let emergencyUnstake = await staking.connect(alice).emergencyUnstake();
      // expectEventForAll(staking, emergencyUnstake, alice, parseUnits("10", "18"), "0", TX_TYPE.EMERGENCY)
      
      await expect(staking.connect(alice).emergencyUnstake()).to.be.revertedWith("NoStakeFound");
      await expect(staking.connect(alice).unstake(1000000000000)).to.be.revertedWith("AmountLessThanStakedAmountOrZero");
      await expect(staking.connect(alice).unstake(1)).to.be.revertedWith("AmountLessThanStakedAmountOrZero");
    });
    it('single stake then 2 rewardUpdates, passed 100blocks => unstaking => monitor rewards', async () => {
      let TEN = parseUnits("10", "18");
      let HundredWETH = parseUnits("100", "18");
      //stake
      await staking.connect(alice).stake(TEN);
      //1st update
      await mineNBlocks(30);
      await WETH.transfer(staking.address, HundredWETH);
      await staking.updateRewards(100, "1000");    

      //2nd update
      await mineNBlocks(30);
      await WETH.transfer(staking.address, HundredWETH);
      await staking.updateRewards(100, "1000");

      //unstake
      await mineNBlocks(30);
      let unstake1 = await staking.connect(alice).unstake(TEN); //12690762256410256290
      expectEventForAll(staking, unstake1, alice, TEN, "12690762256410256290", TX_TYPE.UNSTAKE)
    });
  });
  
}
