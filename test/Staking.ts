import { use } from "chai";
import { solidity } from "ethereum-waffle";
import { shouldBehaveLikeStake } from "./Stake/Stake.behavior";
import { shouldBehaveLikeUnstake } from "./Unstake/Unstake.behavior";
import { shouldBehaveLikeUpdateReward } from "./UpdateReward/UpdateReward.behavior";
import { shouldBehaveLikeClaim } from "./Claim/Claim.behavior";

use(solidity);

describe("Invokes Stake", async () => {
  await shouldBehaveLikeStake()
});

describe("Invokes Claim", async () => {
  // await shouldBehaveLikeClaim()
});

describe("Invokes Unstake", async () => {
  // await shouldBehaveLikeUnstake();
});

describe("Invokes UpdateReward", async () => {
//   await shouldBehaveLikeUpdateReward()
});
