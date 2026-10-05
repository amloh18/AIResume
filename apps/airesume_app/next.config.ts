import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";
// Force rebuild'

const nextConfig: NextConfig = {
  // NOTE: there is deliberately NO `turbopack.resolveAlias` for `@shared` here, and this app is not
  // edited by the admin split at all.
  //
  // Shared code between this app and `apps/admin` stays here, in `src/`. The admin app points its OWN
  // `@/` at this tree (see `apps/admin/next.config.ts`). Because every shared file already writes
  // `@/lib/...` — and an alias is resolved per-BUILD from the project's own import map — admin's alias
  // makes those specifiers resolve *in admin* without this app needing a matching alias or a single
  // rewritten file. An `@shared` alias here would be dead config.

  // Disable Fast Refresh notifications
  devIndicators: {
    position: 'bottom-right',
  },
  // Simplified webpack configuration to fix React hooks error
  webpack: (config, { dev, isServer }) => {
    // Import webpack once
    const webpack = require('webpack');

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
    // CRITICAL: Only polyfill process/Buffer for client builds
    // Server builds (Node.js) already have these and we MUST NOT overwrite them
    // Overwriting process on server removes access to process.env!
    if (!isServer) {
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }



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

    // For Edge Runtime builds (middleware), exclude Sentry
    const isMiddlewareBuild = config.entry && typeof config.entry === 'object' &&
      Object.keys(config.entry).some(key =>
        key.includes('middleware') || key.includes('edge')
      );

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

    // Legacy component aliases removed - components have been migrated

    // Apply Sentry exclusions only for Edge Runtime builds (middleware)
    // React must always be available for client components
    if (isMiddlewareBuild) {
      Object.assign(config.resolve.alias, sentryAliases);
    }

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

    // For Edge Runtime builds (middleware) or client builds, exclude monitoring modules
    if (isMiddlewareBuild || !isServer) {
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
        '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
        'puppeteer': 'commonjs puppeteer',
        'pdf2pic': 'commonjs pdf2pic',
      });
    }


    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'coresg-normal.trae.ai',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
    ],
    // Enable modern image formats for better performance
    formats: ['image/avif', 'image/webp'],
    // Optimize image loading
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Minimum quality for optimization
    minimumCacheTTL: 60,
    // Configure allowed image qualities to resolve next-image-unconfigured-qualities warnings
    qualities: [75, 80, 85, 100],
  },
  // Performance optimizations
  experimental: {
    // Disable aggressive CSS optimization (critters) to reduce memory usage during build
    // optimizeCss: true,
    // Optimize imports for common heavy libraries
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'date-fns',
      'lodash'
    ],
  },
  // Force dynamic rendering for all pages to prevent SSR issues
  // Disable static optimization to prevent build errors with React hooks
  staticPageGenerationTimeout: 1000,

  // Handle API routes properly
  // Note: chrome-extension:// origins are handled dynamically in route handlers via setCorsHeaders().
  // We intentionally do NOT set a static Access-Control-Allow-Origin here: the header must contain
  // exactly one origin (or a wildcard), never a comma-separated list, and it must match the
  // requesting origin. Route handlers set the correct value per-request instead.
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, Cookie' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Vary', value: 'Origin' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
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
  // Performance optimizations
  compiler: {
    // Strip dev console.log/info/debug from production builds, but KEEP console.error
    // and console.warn so real errors are still visible in server/production logs.
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  reactStrictMode: true,
  // Vercel deployment optimizations
  trailingSlash: false,
  
  transpilePackages: ['next-auth'],

  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/dashboard/jobs',
        permanent: false,
      },
      {
        source: '/dashboard/tracker',
        destination: '/dashboard/jobs?tab=applications',
        permanent: true,
      },
      {
        source: '/business',
        destination: '/b2b',
        permanent: true,
      },
      // Rebrand: legacy comparison URL
      {
        source: '/compare/cvcircle-vs-cakeresume',
        destination: '/compare/ai-resume-vs-cakeresume',
        permanent: true,
      },
      // Rebrand: legacy blog URL
      {
        source: '/blog/why-cvcircle-beats-cakecv',
        destination: '/blog/why-ai-resume-beats-cakecv',
        permanent: true,
      },
      // Domain migration: redirect legacy domains to buildairesume.com
      // (active when the app is served from these legacy domains)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'cvcircle.io' }],
        destination: 'https://buildairesume.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.cvcircle.io' }],
        destination: 'https://buildairesume.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'app.cvcircle.io' }],
        destination: 'https://buildairesume.com/:path*',
        permanent: true,
      },
    ];
  },

  // External packages for server-side rendering
  serverExternalPackages: [
    'pdfjs-dist',
    '@napi-rs/canvas',
    'tesseract.js',
    'puppeteer',
    'mongoose',
    'pdf2pic',
    'pdf-parse',
    'stripe',
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
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  // Handle dynamic imports + PostHog reverse proxy
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "morigrid-labs",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: false,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles by deleting them after upload
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  },
});
