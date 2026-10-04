import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API routes read dated samples from disk when a live feed fails.
  outputFileTracingIncludes: {
    "/api/**": ["./src/data/samples/**"],
  },
};

export default nextConfig;
