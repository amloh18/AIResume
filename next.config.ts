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
    position: 'bottom-right',
  },
  // Additional configuration to disable dev notifications
  webpack: (config, { dev, isServer }) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Handle WebAssembly modules
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Handle Node.js built-in modules with node: scheme
    config.module.rules.push({
      test: /\.js$/,
      resolve: {
        alias: {
          'node:process': 'process/browser',
          'node:path': 'path-browserify',
          'node:fs': 'fs',
          'node:os': 'os-browserify/browser',
          'node:crypto': 'crypto-browserify',
          'node:util': 'util',
          'node:stream': 'stream-browserify',
          'node:buffer': 'buffer',
          'node:url': 'url',
          'node:querystring': 'querystring-es3',
          'node:events': 'events',
        },
      },
    });

    // Add webpack plugins for Node.js polyfills
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      })
    );

    // Fix jose library compatibility with Next.js 15
    // Jose tries to read process.version which is undefined in webpack bundles
    if (isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.version': JSON.stringify(process.version),
        })
      );
    }

    // Disable Fast Refresh notifications in development
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
      };
    }
    
    // Handle framer-motion and Node.js modules properly
    config.resolve.alias = {
      ...config.resolve.alias,
      'framer-motion': require.resolve('framer-motion'),
      // Handle Node.js built-in modules
      'node:process': 'process/browser',
      'node:path': 'path-browserify',
      'node:fs': 'fs',
      'node:os': 'os-browserify/browser',
      'node:crypto': 'crypto-browserify',
      'node:util': 'util',
      'node:stream': 'stream-browserify',
      'node:buffer': 'buffer',
      'node:url': 'url',
      'node:querystring': 'querystring-es3',
      'node:events': 'events',
    };

    // Handle optional dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      // Handle farmhash-modern WASM fallback
      'farmhash-modern': false,
      // Handle Node.js built-in modules with polyfills
      'node:process': 'process/browser',
      'node:path': 'path-browserify',
      'node:fs': 'fs',
      'node:os': 'os-browserify/browser',
      'node:crypto': 'crypto-browserify',
      'node:util': 'util',
      'node:stream': 'stream-browserify',
      'node:buffer': 'buffer',
      'node:url': 'url',
      'node:querystring': 'querystring-es3',
      'node:events': 'events',
      'node:child_process': false,
      'node:cluster': false,
      'node:worker_threads': false,
      'node:perf_hooks': false,
      'node:async_hooks': false,
      'node:timers': false,
      'node:tty': false,
      'node:readline': false,
      'node:repl': false,
      'node:vm': false,
      'node:zlib': false,
      'node:http': false,
      'node:https': false,
      'node:http2': false,
      'node:net': false,
      'node:dgram': false,
      'node:dns': false,
      'node:tls': false,
      'node:assert': false,
      'node:constants': false,
      'node:domain': false,
      'node:punycode': false,
      'node:string_decoder': false,
      'node:sys': false,
      'node:timers/promises': false,
      'node:util/types': false,
      'node:worker_threads': false,
    };

    // Add webpack plugin to handle Node.js built-in modules
    const webpack = require('webpack');
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^node:/,
        (resource) => {
          const moduleName = resource.request.replace(/^node:/, '');
          if (moduleName === 'process') {
            resource.request = 'process/browser';
          } else if (moduleName === 'stream') {
            resource.request = 'stream-browserify';
          } else if (moduleName === 'buffer') {
            resource.request = 'buffer';
          } else if (moduleName === 'util') {
            resource.request = 'util';
          } else if (moduleName === 'url') {
            resource.request = 'url';
          } else if (moduleName === 'querystring') {
            resource.request = 'querystring-es3';
          } else if (moduleName === 'events') {
            resource.request = 'events';
          } else if (moduleName === 'path') {
            resource.request = 'path-browserify';
          } else if (moduleName === 'os') {
            resource.request = 'os-browserify/browser';
          } else if (moduleName === 'crypto') {
            resource.request = 'crypto-browserify';
          } else {
            resource.request = false;
          }
        }
      )
    );

    // Module resolution aliases (already configured above)

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
        'jose': 'commonjs jose',
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
    optimizePackageImports: ['lucide-react', 'lottie-react'],
  },
  
  // Force dynamic rendering for all pages to prevent SSR issues
  // Disable static optimization to prevent build errors with React hooks
  staticPageGenerationTimeout: 1000,
  
  // Handle API routes properly
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Cookie' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Cookie' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
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
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
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
  serverExternalPackages: ['mongoose', 'firebase-admin', 'jose', 'next-auth', 'openid-client'],
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
