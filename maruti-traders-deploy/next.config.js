/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": ["./prisma/dev.db"],
    },
  },
};

module.exports = nextConfig;
