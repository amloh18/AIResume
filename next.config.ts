import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable Fast Refresh notifications
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  // Additional configuration to disable dev notifications
  webpack: (config, { dev, isServer }) => {
    // Disable Fast Refresh notifications in development
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }
    
    // Handle optional dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Module resolution aliases
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          clerk: {
            test: /[\\/]node_modules[\\/]@clerk[\\/]/,
            name: 'clerk',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }

    // Handle optional dependencies for Vercel
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push({
        'tesseract.js': 'commonjs tesseract.js',
        'canvas': 'commonjs canvas',
        'puppeteer': 'commonjs puppeteer',
      });
    }

    return config;
  },
  images: {
    domains: ['ui-avatars.com', 'placehold.co'],
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['framer-motion', 'lucide-react', 'lottie-react'],
  },
  // Vercel-specific optimizations
  serverExternalPackages: ['mongoose'],
  // Handle API routes properly
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ]
  },
  // Environment variables for Vercel
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
    MONGODB_URI: process.env.MONGODB_URI,
  },
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  reactStrictMode: true,
  // Vercel deployment optimizations
  output: 'standalone',
  trailingSlash: false,
  // Handle dynamic imports
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
}

export default nextConfig
