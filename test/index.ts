import { use } from "chai";
import { solidity } from "ethereum-waffle";
import { shouldBehaveLikeStaking } from "./Staking/Staking.behavior";

use(solidity);

describe("Invokes Staking", async () => {
  await shouldBehaveLikeStaking();
});