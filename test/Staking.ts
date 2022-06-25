import { use } from "chai";
import { solidity } from "ethereum-waffle";
import { shouldBehaveLikeStake } from "./Stake/Stake.behavior";
import { shouldBehaveLikeUnstake } from "./Unstake/Unstake.behavior";
import { shouldBehaveLikeGovernance } from "./Governance/Governance.behavior";
import { shouldBehaveLikeClaim } from "./Claim/Claim.behavior";
import { shouldBehaveLikeViewRewards } from "./ViewReward/ViewReward.behavior";
import { shouldBehaveLikeSixDecimalsToken } from "./SixDecimalsToken/SixDecimalsToken.behavior";

use(solidity);

//NOTICE: run all tasks independently, not all at the same time.
//there is some issue in hardhat local env. of network skewness.
//due to which events emission is skipped
//so it would be better to run one task at a time
describe("Invokes Stake", async () => {
  await shouldBehaveLikeStake();
});

describe("Invokes Claim", async () => {
  // await shouldBehaveLikeClaim()
});

describe("Invokes Unstake", async () => {
  // await shouldBehaveLikeUnstake();
});

describe("Invokes Governance", async () => {
  // await shouldBehaveLikeGovernance();
});

describe("Invokes View Reward", async () => {
  // await shouldBehaveLikeViewRewards();
});

describe("Invokes Six Decimals Tokens", async () => {
  // await shouldBehaveLikeSixDecimalsToken();
});
