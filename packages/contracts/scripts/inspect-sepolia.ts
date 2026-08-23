import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const transactionCount = await ethers.provider.getTransactionCount(deployer.address);
  const deployments = await Promise.all(
    Array.from({ length: transactionCount }, async (_, nonce) => {
      const address = ethers.getCreateAddress({ from: deployer.address, nonce });
      const code = await ethers.provider.getCode(address);
      return {
        nonce,
        address,
        deployed: code !== "0x",
        codeHash: code === "0x" ? null : ethers.keccak256(code),
      };
    })
  );

  console.log(JSON.stringify({ deployer: deployer.address, transactionCount, deployments }, null, 2));
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
