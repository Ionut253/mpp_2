/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  images: {
    unoptimized: false,
    domains: ['localhost'],
    remotePatterns: [],
  },
  compress: true,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig; 