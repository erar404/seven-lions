import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sevenlions-studio.carrd.co',
      },
      {
        protocol: 'https',
        hostname: 'nhxozevkhypnfueybufj.supabase.co',
      },
    ],
  },
}

export default nextConfig
