import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "node:path";

// Share the repository's server-only .env with this workspace. Next still
// loads apps/web/.env.local and keeps it higher priority for local overrides.
config({ path: resolve(process.cwd(), '../../.env') });

const nextConfig: NextConfig = {
  typedRoutes: true,
};

export default nextConfig;
