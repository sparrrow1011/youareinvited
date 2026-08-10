/** @type {import('next').NextConfig} */
const BACKEND_URL =
  process.env.BACKEND_URL || 'https://backend.v0.youare-invited.com';

const nextConfig = {
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
      },
      {
        protocol: 'https',
        hostname: 'event-invitation-backend.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'youareinvited-media.s3.amazonaws.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${BACKEND_URL}/media/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
