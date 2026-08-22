import { ethers } from "hardhat";
async function main() { const [deployer] = await ethers.getSigners(); const identity = await ethers.deployContract("TouristIdentity", [deployer.address]); await identity.waitForDeployment(); console.log("TouristIdentity:", await identity.getAddress()); }
main().catch((error) => { console.error(error); process.exitCode = 1; });
