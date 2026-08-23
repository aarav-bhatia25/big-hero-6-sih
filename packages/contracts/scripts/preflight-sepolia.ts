import { ethers } from "hardhat";

async function main() {
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 11_155_111n) {
    throw new Error(`Expected Ethereum Sepolia (11155111), received chain ${network.chainId}.`);
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) {
    throw new Error(`Deployer ${deployer.address} has no Sepolia ETH. Fund it from a Sepolia faucet first.`);
  }

  console.log(
    JSON.stringify({
      network: "sepolia",
      chainId: network.chainId.toString(),
      deployer: deployer.address,
      balanceSepoliaEth: ethers.formatEther(balance),
      ready: true,
    })
  );
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});
