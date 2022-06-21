import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20.d";
import {mineNBlocks, expectUnstake} from "./../common.setup"

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
  describe("#Unstake", () => {
    it("user can't unstake 0 OR greater than staked", async () => {
      await expect(staking.connect(alice).unstake(0)).to.be.revertedWith("AmountLessThanStakedAmountOrZero");
      await staking.connect(alice).stake(parseUnits("10", "18"));

      await expect(staking.connect(alice).unstake(0)).to.be.revertedWith("AmountLessThanStakedAmountOrZero");
      await expect(staking.connect(alice).unstake(parseUnits("11", "18"))).to.be.revertedWith("AmountLessThanStakedAmountOrZero");
      await expect(staking.connect(alice).unstake(parseUnits("9", "18"))).to.not.reverted;
    });
    it('user can emergency unstake after reward duration has ended', async () => {
      await staking.connect(alice).stake(parseUnits("10", "18"));
      await mineNBlocks(3000);
      let emUnstake = await staking.connect(alice).unstake(parseUnits("10", "18"));
      expectUnstake(staking, emUnstake, alice, parseUnits("10", "18"),0);
      await expect(staking.connect(alice).unstake(parseUnits("10", "18"))).to.be.revertedWith("AmountLessThanStakedAmountOrZero");
    })
  });
  it('single stake then 2 rewardUpdates, passed 100blocks => unstaking => monitor rewards', async () => {
    let TEN = parseUnits("10", "18");
    let HundredWETH = parseUnits("100", "18");
    
    await staking.connect(alice).stake(TEN);
    let currentBlockNumber = await ethers.provider.getBlockNumber();
    
    // await mineNBlocks(30);
    // await WETH.transfer(staking.address, HundredWETH);
    // await staking.updateRewards(100, "1000");    
    
    // await mineNBlocks(30);
    // await WETH.transfer(staking.address, HundredWETH);
    // await staking.updateRewards(100, "1000");

    // await mineNBlocks(30);
  })
}
