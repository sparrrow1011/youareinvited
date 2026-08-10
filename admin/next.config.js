/** @type {import('next').NextConfig} */
const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://backend.v0.youare-invited.com';

const nextConfig = {
  // Prevent Next.js from issuing 308 redirects to strip trailing slashes.
  // Without this, /api/superadmin/users/ gets redirected before the rewrite runs,
  // and the browser caches that 308 permanently.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination: `${BACKEND_URL}/api/:path*/`,
      },
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
