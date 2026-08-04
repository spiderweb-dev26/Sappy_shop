/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ["xlsx", "qrcode", "@neondatabase/serverless", "@prisma/adapter-neon"],
  },
};
export default nextConfig;