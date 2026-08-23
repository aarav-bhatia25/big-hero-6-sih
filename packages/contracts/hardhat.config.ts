import "@nomicfoundation/hardhat-toolbox";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import type { HardhatUserConfig } from "hardhat/config";

// The app keeps its runtime configuration in apps/web/.env.local, while a
// deployer may instead use the root .env. Load both without overwriting values
// explicitly supplied by the shell/CI.
loadEnv({ path: resolve(__dirname, "../../.env") });
loadEnv({ path: resolve(__dirname, "../../apps/web/.env.local") });

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    localhost: { url: process.env.LOCAL_CHAIN_RPC_URL ?? "http://127.0.0.1:8545" },
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL || process.env.CHAIN_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : process.env.ANCHOR_PRIVATE_KEY
          ? [process.env.ANCHOR_PRIVATE_KEY]
          : [],
    },
  },
};
export default config;
