import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API routes read dated samples from disk when a live feed fails.
  outputFileTracingIncludes: {
    "/api/**": ["./src/data/samples/**"],
  },
  // The pitch deck is a static page in public/pitch.
  async redirects() {
    return [{ source: "/pitch", destination: "/pitch/index.html", permanent: false }];
  },
};

export default nextConfig;
