import { ethers } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * Deploys all Prahari registries to the currently selected network and writes the
 * resulting addresses to deployments/<network>.json so the web app can load them.
 *
 * Local dev:  pnpm --filter @prahari/contracts exec hardhat node   (separate terminal)
 *             pnpm --filter @prahari/contracts run deploy:local
 * Sepolia:    set ALCHEMY_SEPOLIA_URL + DEPLOYER_PRIVATE_KEY, then deploy:sepolia
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  console.log(`Deploying with ${deployer.address} on chainId ${net.chainId}`);

  const deploy = async (name: string) => {
    const factory = await ethers.getContractFactory(name);
    const c = await factory.deploy(deployer.address);
    await c.waitForDeployment();
    const addr = await c.getAddress();
    console.log(`${name} -> ${addr}`);
    return addr;
  };

  const addresses = {
    IncidentRegistry: await deploy("IncidentRegistry"),
    TouristIdentityRegistry: await deploy("TouristIdentityRegistry"),
    GeofenceRegistry: await deploy("GeofenceRegistry"),
    ResponderRegistry: await deploy("ResponderRegistry"),
  };

  const out = {
    chainId: Number(net.chainId),
    deployer: deployer.address,
    addresses,
  };

  const dir = join(__dirname, "..", "deployments");
  mkdirSync(dir, { recursive: true });
  const networkName = net.chainId === 31337n ? "localhost" : `chain-${net.chainId}`;
  const file = join(dir, `${networkName}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${file}`);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
