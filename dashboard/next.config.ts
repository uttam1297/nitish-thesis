import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dashboardRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: dashboardRoot,
  },
};

export default nextConfig;
