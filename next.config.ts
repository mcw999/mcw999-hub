import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/mcw999-hub",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
