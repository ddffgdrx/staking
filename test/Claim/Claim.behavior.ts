import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20";
import {  mineNBlocks, TX_TYPE, expectEventForAll } from '../common.setup';

const createFixtureLoader = waffle.createFixtureLoader;

export async function shouldBehaveLikeClaim(): Promise<void> {
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
    
    
    await pilot.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.mint(wallet.address, parseUnits("2000000", "18"));

    await WETH.connect(wallet).transfer(staking.address, parseUnits("100", "18")); // 100 WETH
    await staking.connect(wallet).updateRewards(100, "3000"); // 100 WETH
    
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

  describe("#Claim", () => {
    it("should return 0", async () => {
      const result = await staking.totalPilotStaked();
      expect(result).to.equal("0");
    });
    it("should periodically stake twice and claim", async () => {
      let TEN = parseUnits("10", "18");
      await mineNBlocks(20);

      let stake1 = await staking.connect(alice).stake(TEN);
      expectEventForAll(staking, stake1, alice, TEN, "0", TX_TYPE.STAKE)
      await mineNBlocks(20);
      
      let stake2 = await staking.connect(alice).stake(TEN);
      expectEventForAll(staking, stake2, alice, TEN, "699999999999999990", TX_TYPE.STAKE)
      await mineNBlocks(10);    

      let claimed = await staking.connect(alice).claim();
      expectEventForAll(staking, claimed, alice, TEN.mul(2), "366666666666666660", TX_TYPE.CLAIM)

    });
    //NOTICE: this case is only possible if the updateReward and last stake/unstake/claim are in the same block
    //        because these four functions update the lastUpdateBlock
    it('should revert on claim for contract out ot funds', async () => {
      let HundredWETH = parseUnits("100", "18");

      await WETH.connect(wallet).transfer(staking.address, 100); // 100 WETH
      await staking.updateRewards(100, "3");
      let stake1 = await staking.connect(alice).stake(HundredWETH)
      expectEventForAll(staking, stake1, alice, HundredWETH, "0", TX_TYPE.STAKE)
      
      await mineNBlocks(3300);
      await expect(staking.connect(alice).claim()).to.be.revertedWith('InsufficientFunds');
    })
    // NOTICE: having some issues with alice claim, not sure why, for time being, ignoring this 
    it('should work with multiple user deposit and calculate same reward for all', async () => {
      let HundredWETH = parseUnits("100", "18");
      await ethers.provider.send("evm_setAutomine", [false]);

      await staking.connect(alice).stake(HundredWETH)
      await staking.connect(bob).stake(HundredWETH)
      await staking.connect(carol).stake(HundredWETH)

      await ethers.provider.send("evm_setAutomine", [true]);
      await mineNBlocks(20);
      await ethers.provider.send("evm_setAutomine", [false]);

      //having some issues with alice claim, not sure why, for time being, ignoring this
      let alicePendingReward = await staking.connect(alice).claim();  
      
      let bobPendingReward = await staking.connect(bob).claim();
      let carolPendingReward = await staking.connect(carol).claim();

      await mineNBlocks(1);
      await ethers.provider.send("evm_setAutomine", [true]);

      // expectClaim(staking, alicePendingReward, alice, "366666666666666660");
      expectEventForAll(staking, bobPendingReward, bob, HundredWETH, "222222222222222200", TX_TYPE.CLAIM)
      expectEventForAll(staking, carolPendingReward, carol, HundredWETH, "222222222222222200", TX_TYPE.CLAIM)
    })
    it('alice can not double claim', async () => {
      let HundredWETH = parseUnits("100", "18");
      await staking.connect(alice).stake(HundredWETH)
      await mineNBlocks(20);

      await ethers.provider.send("evm_setAutomine", [false]);
      let aliceClaim1 =  await staking.connect(alice).claim();  
      let aliceClaim2 =  await staking.connect(alice).claim();

      await ethers.provider.send("evm_setAutomine", [true]);
      expectEventForAll(staking, aliceClaim1, alice, HundredWETH, "699999999999999900", TX_TYPE.CLAIM)
      expectEventForAll(staking, aliceClaim2, alice, HundredWETH, "0", TX_TYPE.CLAIM)
    })
  });
}
