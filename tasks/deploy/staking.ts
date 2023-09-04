import { deployContract } from "./utils";
import { formatEther } from "ethers/lib/utils";
import { task } from "hardhat/config";

//PILOT: 0x37C997B35C619C21323F3518B9357914E8B99525
//GOVERNANCE: 0xAfA13aa8F1b1d89454369c28b0CE1811961A7907
//DISTRIBUTION BLOCKS: 27780
//REWARDS TO DISTRIBUTE: 600000000000000000
//STAKE TO: 0x1E3881227010c8DcDFa2F11833D3d70A00893f94
//WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2

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

    const unixprotocolStakingSetup = await deployContract(
      "UnixprotocolStakingSetup",
      await ethers.getContractFactory("UnixprotocolStakingSetup"),
      signer,
      [args.pilotToken]
    );

    await unixprotocolStakingSetup.deployTransaction.wait(5);
    delay(60000);

    console.log("Verifying Smart Contract ...");

    await run("verify:verify", {
      address: unixprotocolStakingSetup.address,
      constructorArguments: [args.pilotToken],
    });
  });

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
      "UnixprotocolStaking",
      await ethers.getContractFactory("UnixprotocolStaking"),
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

task("setup-staking-contract", "Setup unipilot staking contract")
  .addParam("governance", "governance address")
  .addParam("distributionBlocks", "no of blocks to distribute reward")
  .addParam("reward", "reward amount")
  .setAction(async (cliArgs, { ethers, run, network }) => {
    let setupContract = "0x5E865b76CdC0fD429938eb4a36097aDDBe0970a8";
    let stakingContract = "0xC9256E6e85ad7aC18Cd9bd665327fc2062703628";
    let stakeTo = "0x1E3881227010c8DcDFa2F11833D3d70A00893f94";
    let stakeAmount = "10000000000000000000"; // 10 pilot

    const signer = (await ethers.getSigners())[0];
    console.log("Signer");

    console.log("  at", signer.address);
    console.log("  ETH", formatEther(await signer.getBalance()));

    console.log("Task Args");
    console.log(cliArgs);

    let stakingSetup = await ethers.getContractAt(
      "UnixprotocolStakingSetup",
      setupContract,
      signer
    );

    let tx1 = await stakingSetup.setStakingAddress(stakingContract);
    let receipt1 = await tx1.wait();
    console.log("Set staking contract ", receipt1.logs);

    let tx2 = await stakingSetup.doSetup(
      stakeTo,
      cliArgs.governance,
      stakeAmount,
      cliArgs.reward,
      cliArgs.distributionBlocks
    );
    let receipt2 = await tx2.wait();
    console.log("Setup tx ", receipt2);
  });

// task("verify-unipilot-staking", "Deploy Unipilot Staking Contract").setAction(
//   async (cliArgs, { ethers, run, network }) => {
//     console.log("Verifying Smart Contract ...");

//     await run("verify:verify", {
//       address: "0xC9256E6e85ad7aC18Cd9bd665327fc2062703628",
//       constructorArguments: [
//         "0x5E865b76CdC0fD429938eb4a36097aDDBe0970a8",
//         "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//         "0x37C997B35C619C21323F3518B9357914E8B99525",
//       ],
//     });
//   }
// );

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
