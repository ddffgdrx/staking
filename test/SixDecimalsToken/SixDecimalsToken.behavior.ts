import { expect } from "chai";
import { parseUnits } from "ethers/lib/utils";
import { stakingConfigFixture } from "../shared/fixtures";
import { MaxUint256 } from "@ethersproject/constants";
import { ethers, waffle } from "hardhat";
import { UnipilotStaking } from "../../typechain/UnipilotStaking";
import { TestERC20 } from "../../typechain/TestERC20";
import { TestERC206D } from "../../typechain/TestERC206D.d";
import { mineNBlocks, TX_TYPE, expectEventForAll } from "../common.setup";

const createFixtureLoader = waffle.createFixtureLoader;

export async function shouldBehaveLikeSixDecimalsToken(): Promise<void> {
  let staking: UnipilotStaking;
  let pilot: TestERC20;
  let WETH: TestERC20;
  let HUNDRED = parseUnits("100", "18");
  let TEN = parseUnits("10", "18");
  let ONE = parseUnits("1", "18");
  let SIX_DECIMALS: TestERC206D; // 6 Decimals reward token
  let ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  let loadFixture: ReturnType<typeof createFixtureLoader>;

  const [wallet, alice, bob, carol, newWallet] = waffle.provider.getWallets();

  before("fixtures deployer", async () => {
    loadFixture = createFixtureLoader([wallet]);
  });
  beforeEach("fixtures", async () => {
    const res = await loadFixture(stakingConfigFixture);
    staking = res.staking;
    pilot = res.pilot;
    WETH = res.WETH;
    SIX_DECIMALS = res.WETH6D;

    await pilot.mint(wallet.address, parseUnits("2000000", "18"));
    await WETH.mint(wallet.address, parseUnits("2000000", "18"));
    await SIX_DECIMALS.mint(wallet.address, parseUnits("2000000", "18"));

    await WETH.transfer(staking.address, HUNDRED);
    await staking.updateRewards(100, 100);

    await pilot.connect(wallet).approve(staking.address, MaxUint256);
    await WETH.connect(wallet).approve(staking.address, MaxUint256);
    await SIX_DECIMALS.connect(wallet).approve(staking.address, MaxUint256);
    //admin stake
    await staking.stake(wallet.address, ONE);

    //minting to users
    await pilot.connect(alice).mint(alice.address, parseUnits("2000000", "18"));
    await pilot.connect(bob).mint(bob.address, parseUnits("2000000", "18"));
    await pilot.connect(carol).mint(carol.address, parseUnits("2000000", "18"));

    //approvals from users to staking contract
    await pilot.connect(alice).approve(staking.address, MaxUint256);
    await pilot.connect(bob).approve(staking.address, MaxUint256);
    await pilot.connect(carol).approve(staking.address, MaxUint256);
  });
  describe("#RewardAndGovernance", () => {
    it("should return 1 eth", async () => {
      const result = await staking.totalPilotStaked();
      expect(result).to.equal(ONE);
    });
  });
}
