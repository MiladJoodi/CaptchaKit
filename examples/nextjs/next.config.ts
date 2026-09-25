import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Monorepo / file: dependency tracing root
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
