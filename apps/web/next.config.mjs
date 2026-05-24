/** @type {import('next').NextConfig} */
const apiInternalUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      // Proxy: o browser chama /api/v1/* no mesmo domínio público;
      // Next.js encaminha p/ container interno da API.
      { source: '/api/v1/:path*', destination: `${apiInternalUrl}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
