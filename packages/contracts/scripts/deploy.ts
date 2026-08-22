import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Tourist Safety Platform smart contracts with deployer:", deployer.address);

  // 1. Deploy IncidentRegistry
  const IncidentRegistryFactory = await ethers.getContractFactory("IncidentRegistry");
  const incidentRegistry = await IncidentRegistryFactory.deploy(deployer.address);
  await incidentRegistry.waitForDeployment();
  const incidentRegistryAddr = await incidentRegistry.getAddress();
  console.log("IncidentRegistry deployed to:", incidentRegistryAddr);

  // 2. Deploy TouristIdentityRegistry
  const TouristIdentityRegistryFactory = await ethers.getContractFactory("TouristIdentityRegistry");
  const touristIdentityRegistry = await TouristIdentityRegistryFactory.deploy(deployer.address);
  await touristIdentityRegistry.waitForDeployment();
  const touristIdentityRegistryAddr = await touristIdentityRegistry.getAddress();
  console.log("TouristIdentityRegistry deployed to:", touristIdentityRegistryAddr);

  // 3. Deploy GeofenceRegistry
  const GeofenceRegistryFactory = await ethers.getContractFactory("GeofenceRegistry");
  const geofenceRegistry = await GeofenceRegistryFactory.deploy(deployer.address);
  await geofenceRegistry.waitForDeployment();
  const geofenceRegistryAddr = await geofenceRegistry.getAddress();
  console.log("GeofenceRegistry deployed to:", geofenceRegistryAddr);

  // 4. Deploy ResponderRegistry
  const ResponderRegistryFactory = await ethers.getContractFactory("ResponderRegistry");
  const responderRegistry = await ResponderRegistryFactory.deploy(deployer.address);
  await responderRegistry.waitForDeployment();
  const responderRegistryAddr = await responderRegistry.getAddress();
  console.log("ResponderRegistry deployed to:", responderRegistryAddr);

  console.log("\n--- Smart Contracts Deployment Summary ---");
  console.log({
    IncidentRegistry: incidentRegistryAddr,
    TouristIdentityRegistry: touristIdentityRegistryAddr,
    GeofenceRegistry: geofenceRegistryAddr,
    ResponderRegistry: responderRegistryAddr,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
