/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Output configuration (disabled for dev)
  // output: 'standalone',
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'AvAdmin',
  },
  
  // Image configuration
  images: {
    domains: ['localhost', 'admin.avelarcompany.com.br'],
    unoptimized: true, // For Docker
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3001', 'admin.avelarcompany.com.br']
    }
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Fallback for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;