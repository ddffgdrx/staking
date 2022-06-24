import { deployContract } from "./utils";
import { formatEther } from "ethers/lib/utils";
import { task } from "hardhat/config";

task("deploy-unipilot-staking", "Deploy Unipilot Staking Contract")
  .addParam("governance", "governance address")
  .addParam("reward", "reward token address")
  .addParam("pilot", "pilot token address")
  .setAction(async (cliArgs, { ethers, run, network }) => {
    await run("compile");

    const signer = (await ethers.getSigners())[0];
    console.log("Signer");

    console.log("  at", signer.address);
    console.log("  ETH", formatEther(await signer.getBalance()));

    const args = {
      governance: cliArgs.governance,
      rewardToken: cliArgs.reward,
      pilotToken: cliArgs.pilot,
    };

    console.log("Network");
    console.log("   ", network.name);
    console.log("Task Args");
    console.log(args);

    const unipilotStaking = await deployContract(
      "UnipilotStaking",
      await ethers.getContractFactory("UnipilotStaking"),
      signer,
      [args.governance, args.rewardToken, args.pilotToken]
    );

    await unipilotStaking.deployTransaction.wait(5);
    delay(60000);

    console.log("Verifying Smart Contract ...");

    await run("verify:verify", {
      address: unipilotStaking.address,
      constructorArguments: [
        args.governance,
        args.rewardToken,
        args.pilotToken,
      ],
    });
  });

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
