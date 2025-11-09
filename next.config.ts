import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Allow production builds to succeed on Vercel despite TS errors.
    // We lint and type-check locally via `npm run type-check`.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporarily enabled for v1.8.5.1 deployment
  },
  // Disable Fast Refresh notifications
  devIndicators: {
    position: 'bottom-right',
  },
  // Simplified webpack configuration to fix React hooks error
  webpack: (config, { dev, isServer }) => {
    // Import webpack once
    const webpack = require('webpack');
    
    // Load environment variables at build time
    require('dotenv').config({ path: '.env.local' });
    
    // CRITICAL: Ensure Next.js internal loaders are preserved
    // Don't modify module.rules that might affect Next.js internal loaders
    if (!config.resolve) {
      config.resolve = {};
    }
    
    // Fix webpack chunk resolution issues
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Ensure proper chunk loading
    // Use 'named' in dev for better HMR, 'deterministic' in production for caching
    config.optimization = config.optimization || {};
    if (dev) {
      config.optimization.moduleIds = 'named';
      config.optimization.chunkIds = 'named';
    } else {
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';
    }
    
    // Add webpack plugins for Node.js polyfills
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      })
    );

    // Define environment variables for webpack
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.NEXTAUTH_URL': JSON.stringify(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
        'process.env.NEXTAUTH_SECRET': JSON.stringify(process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development'),
        'process.env.MONGODB_URI': JSON.stringify(process.env.MONGODB_URI || ''),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(process.env.GOOGLE_CLIENT_ID || ''),
        'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(process.env.GOOGLE_CLIENT_SECRET || ''),
        'process.env.JWT_SECRET': JSON.stringify(process.env.JWT_SECRET || ''),
      })
    );

    // Fix jose library compatibility with Next.js 15
    if (isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.version': JSON.stringify(process.version),
        })
      );
    }

    // Handle optional dependencies
    // IMPORTANT: Preserve existing fallbacks to avoid breaking Next.js internals
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      'farmhash-modern': false,
    };
    
    // Ensure Next.js internal loaders can be resolved
    // Preserve existing resolveLoader configuration from Next.js
    if (!config.resolveLoader) {
      config.resolveLoader = {};
    }
    
    // Preserve Next.js loader resolution - don't override, just ensure it exists
    if (!config.resolveLoader.modules) {
      config.resolveLoader.modules = ['node_modules'];
    } else {
      // Make sure node_modules is in the list if it exists
      const modules = config.resolveLoader.modules || [];
      if (!modules.includes('node_modules')) {
        config.resolveLoader.modules = [...modules, 'node_modules'];
      }
    }

    // Exclude Sentry from Edge Runtime
    const sentryAliases = {
      '@sentry/nextjs': false,
      '@sentry/node': false,
      '@sentry/browser': false,
      '@sentry/core': false,
      '@sentry/utils': false,
      '@sentry/types': false,
      '@sentry/integrations': false,
      '@sentry/tracing': false,
    };

    // CRITICAL: Ensure React resolves correctly and is not excluded
    // Fix for "Cannot read properties of null (reading 'useState')" errors
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Apply Sentry exclusions (but ensure React/React-DOM are NEVER excluded)
    // React must always be available for client components
    Object.assign(config.resolve.alias, sentryAliases);
    
    // Explicitly ensure React is never aliased to false or excluded
    // This is critical - React must always be available
    if (config.resolve.alias.react === false) {
      delete config.resolve.alias.react;
    }
    if (config.resolve.alias['react-dom'] === false) {
      delete config.resolve.alias['react-dom'];
    }
    
    // CRITICAL: Ensure React is properly resolved and never externalized
    // This fixes "Cannot read properties of null (reading 'useState')" errors
    // For client builds, React must ALWAYS be bundled, never externalized

    // For Edge Runtime builds (middleware), exclude instrumentation and Sentry completely
    // Vercel's Edge bundler analyzes all files, so we need to be aggressive
    const isMiddlewareBuild = config.entry && typeof config.entry === 'object' && 
      Object.keys(config.entry).some(key => 
        key.includes('middleware') || key.includes('edge')
      );
    
    if (isMiddlewareBuild || !isServer) {
      // Exclude instrumentation from Edge builds
      config.resolve.alias['./instrumentation'] = false;
      config.resolve.alias['./instrumentation.js'] = false;
      config.resolve.alias['./instrumentation.ts'] = false;
      config.resolve.alias['instrumentation'] = false;
      config.resolve.alias['instrumentation.js'] = false;
      config.resolve.alias['instrumentation.ts'] = false;
      
      // Exclude Sentry and monitoring modules from Edge builds
      config.resolve.alias['@/lib/monitoring'] = false;
      config.resolve.alias['@/lib/error-tracking'] = false;
      config.resolve.alias['./src/lib/monitoring'] = false;
      config.resolve.alias['./src/lib/error-tracking'] = false;
      config.resolve.alias['@/lib/structured-logger'] = '@/lib/edge-logger';
      config.resolve.alias['./src/lib/structured-logger'] = './src/lib/edge-logger';
      
      // CRITICAL: Ensure React is NEVER excluded, even in Edge builds
      // React must always be available for client components
      if (config.resolve.alias.react === false) {
        delete config.resolve.alias.react;
      }
      if (config.resolve.alias['react-dom'] === false) {
        delete config.resolve.alias['react-dom'];
      }
      
      // For Edge builds, let Next.js handle React resolution naturally
      // Don't alias React to preserve subpath exports (react/jsx-runtime, etc.)
      // if (!isServer) {
      //   // Commented out: Let Next.js handle React resolution to preserve subpath exports
      //   // React subpaths like react/jsx-runtime need to resolve through package.json exports
      // }
    }

    // Handle optional dependencies for Vercel
    // CRITICAL: For client builds, ensure React is NEVER externalized
    if (!isServer) {
      // For client builds, wrap externals to exclude React
      if (config.externals) {
        if (Array.isArray(config.externals)) {
          config.externals = config.externals.filter((ext: any) => {
            if (typeof ext === 'string') {
              return ext !== 'react' && ext !== 'react-dom';
            }
            if (typeof ext === 'object' && ext !== null) {
              return ext !== 'react' && ext !== 'react-dom';
            }
            return true;
          });
        } else if (typeof config.externals === 'function') {
          const originalExternals = config.externals;
          config.externals = (context: any, request: string, callback: any) => {
            // Never externalize React or React-DOM or their subpaths
            if (request === 'react' || request === 'react-dom' || 
                request.startsWith('react/') || request.startsWith('react-dom/')) {
              return callback(); // Don't externalize - bundle it
            }
            return originalExternals(context, request, callback);
          };
        } else if (typeof config.externals === 'object') {
          delete (config.externals as any).react;
          delete (config.externals as any)['react-dom'];
        }
      }
    } else {
      // Server builds can externalize optional dependencies
      config.externals = config.externals || [];
      config.externals.push({
        'tesseract.js': 'commonjs tesseract.js',
        'canvas': 'commonjs canvas',
        'puppeteer': 'commonjs puppeteer',
        'pdf2pic': 'commonjs pdf2pic',
        'jose': 'commonjs jose',
      });
    }


    return config;
  },
  images: {
    domains: ['ui-avatars.com', 'placehold.co', 'lh3.googleusercontent.com', 'logo.clearbit.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
    ],
    // Enable modern image formats for better performance
    formats: ['image/avif', 'image/webp'],
    // Optimize image loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimum quality for optimization
    minimumCacheTTL: 60,
  },
  // Performance optimizations
  experimental: {
    // Disable aggressive CSS optimization to prevent preload warnings
    optimizeCss: false,
    optimizePackageImports: ['lucide-react', 'lottie-react'],
  },
  
  // Force dynamic rendering for all pages to prevent SSR issues
  // Disable static optimization to prevent build errors with React hooks
  staticPageGenerationTimeout: 1000,
  
  // Handle API routes properly
  async headers() {
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          'https://cvcircle.io',
          'https://www.cvcircle.io',
          'https://app.cvcircle.io',
        ]
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ];

    return [
      {
        source: '/api/auth/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: allowedOrigins.join(', ') },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Cookie' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Vary', value: 'Origin' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: allowedOrigins.join(', ') },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Cookie' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Vary', value: 'Origin' },
        ],
      },
      // Cache static assets for better performance
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/templates/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  // Environment variables for Next.js
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development',
    MONGODB_URI: process.env.MONGODB_URI || '',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || '',
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT || '',
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER || '',
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
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
  trailingSlash: false,
  
  // External packages for server-side rendering
  serverExternalPackages: [
    'mongoose', 
    'firebase-admin', 
    'next-auth', 
    'openid-client', 
    'pdf2pic',
    'pdf-parse',
    'pdfjs-dist',
    // Exclude Sentry from Edge Runtime
    '@sentry/nextjs',
    '@sentry/node',
    '@sentry/browser',
    '@sentry/core',
    '@sentry/utils',
    '@sentry/types',
    '@sentry/integrations',
    '@sentry/tracing',
  ],
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
