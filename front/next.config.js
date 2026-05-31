/** @type {import('next').NextConfig} */

// el backend esta en el gateway, lo dejo en una variable por si cambia
const BACKEND = process.env.BACKEND_URL || 'http://127.0.0.1:8080';

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: BACKEND + '/api/:path*',
      },
      {
        source: '/auth/:path*',
        destination: BACKEND + '/auth/:path*',
      },
      {
        source: '/admin/:path*',
        destination: BACKEND + '/admin/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
