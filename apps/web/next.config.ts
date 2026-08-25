import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "node:path";

// Share the repository's server-only .env with this workspace. Next still
// loads apps/web/.env.local and keeps it higher priority for local overrides.
config({ path: resolve(process.cwd(), '../../.env') });

const nextConfig: NextConfig = {
  typedRoutes: true,
  async redirects() {
    return [
      {
        source: '/signin',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/sign-in',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
