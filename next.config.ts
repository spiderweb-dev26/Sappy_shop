import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ["xlsx", "qrcode", "@neondatabase/serverless", "@prisma/adapter-neon"],
};
export default nextConfig;