import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "10.50.64.72",
    "100.88.125.68",
  ],
  experimental: {
    serverActions: {
      // Allow dev preview proxy / LAN origins (127.0.0.x:any port, 10.x.x.x, 100.x.x.x)
      allowedOrigins: ["127.0.0.*", "10.*.*.*", "100.*.*.*"],
    },
  },
};

export default nextConfig;
