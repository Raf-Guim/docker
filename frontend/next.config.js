/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal ./next/standalone server, used by Dockerfile.production.
  output: 'standalone',
};

module.exports = nextConfig;
