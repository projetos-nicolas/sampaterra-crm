/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Next.js 14: chave correta (em 15 virou serverExternalPackages top-level)
    serverComponentsExternalPackages: [
      "@prisma/client",
      "prisma",
      "resend",
      "@react-pdf/renderer",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

module.exports = nextConfig;
