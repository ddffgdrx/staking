import { use } from "chai";
import { solidity } from "ethereum-waffle";
import { shouldBehaveLikeStake } from "./Stake/Stake.behavior";
import { shouldBehaveLikeUnstake } from "./Unstake/Unstake.behavior";
import { shouldBehaveLikeGovernance } from "./Governance/Governance.behavior";
import { shouldBehaveLikeClaim } from "./Claim/Claim.behavior";
import { shouldBehaveLikeViewRewards } from "./ViewReward/ViewReward.behavior";

use(solidity);

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
