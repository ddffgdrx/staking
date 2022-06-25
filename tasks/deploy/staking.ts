import { deployContract } from "./utils";
import { formatEther } from "ethers/lib/utils";
import { task } from "hardhat/config";

task("deploy-unipilot-staking", "Deploy Unipilot Staking Contract")
  .addParam("setupContract", "governance address")
  .addParam("reward", "reward token address")
  .addParam("pilot", "pilot token address")
  .setAction(async (cliArgs, { ethers, run, network }) => {
    await run("compile");

    const signer = (await ethers.getSigners())[0];
    console.log("Signer");

    console.log("  at", signer.address);
    console.log("  ETH", formatEther(await signer.getBalance()));

    const args = {
      governance: cliArgs.setupContract,
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
      [args.governance, args.rewardToken, args.pilotToken],
    );

    await unipilotStaking.deployTransaction.wait(5);
    delay(60000);

    console.log("Verifying Smart Contract ...");

    await run("verify:verify", {
      address: unipilotStaking.address,
      constructorArguments: [args.governance, args.rewardToken, args.pilotToken],
    });
  });

task("deploy-unipilot-setup", "Deploy Unipilot Staking Setup Contract")
  .addParam("pilot", "pilot token address")
  .setAction(async (cliArgs, { ethers, run, network }) => {
    await run("compile");

    const signer = (await ethers.getSigners())[0];
    console.log("Signer");

    console.log("  at", signer.address);
    console.log("  ETH", formatEther(await signer.getBalance()));

    const args = {
      pilotToken: cliArgs.pilot,
    };

    console.log("Network");
    console.log("   ", network.name);
    console.log("Task Args");
    console.log(args);

    const unipilotStakingSetup = await deployContract(
      "UnipilotStakingSetup",
      await ethers.getContractFactory("UnipilotStakingSetup"),
      signer,
      [args.pilotToken],
    );

    await unipilotStakingSetup.deployTransaction.wait(5);
    delay(60000);

    console.log("Verifying Smart Contract ...");

    await run("verify:verify", {
      address: unipilotStakingSetup.address,
      constructorArguments: [args.pilotToken],
    });
  });

task("setup-staking-contract", "Setup unipilot staking contract")
  .addParam("governance", "governance address")
  .addParam("distributionBlocks", "no of blocks to distribute reward")
  .addParam("reward", "reward amount")
  .setAction(async (cliArgs, { ethers, run, network }) => {
    let setupContract = "0xef728Ee8F013b17bb45d548bE047b50f6223DC32";
    let stakingContract = "0x78fFe68b6519D78F872A543Ef8bC45cEcF1900D5";
    let stakeTo = "0xa0e9E6B79a3e1AB87FeB209567eF3E0373210a89";
    let stakeAmount = "15000000000000000000"; // 15 pilot

    const signer = (await ethers.getSigners())[0];
    console.log("Signer");

    console.log("  at", signer.address);
    console.log("  ETH", formatEther(await signer.getBalance()));

    let stakingSetup = await ethers.getContractAt("UnipilotStakingSetup", setupContract, signer);

    await stakingSetup.setStakingAddress(stakingContract);
    await stakingSetup.doSetup(stakeTo, cliArgs.governance, stakeAmount, cliArgs.reward, cliArgs.distributionBlocks);
    console.log("LIVE!!!!!");
  });

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
