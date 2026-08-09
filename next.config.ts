import type { NextConfig } from "next";

const nextConfig: any = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@whiskeysockets/baileys', 'pino'],
};

export default nextConfig;