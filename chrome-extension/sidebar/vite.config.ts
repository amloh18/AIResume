import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin to fix preload link attributes
const fixPreloadPlugin = (): Plugin => {
  return {
    name: 'fix-preload-links',
    transformIndexHtml(html) {
      // Ensure preload links have proper 'as' attribute
      return html.replace(
        /<link([^>]*?)rel=["']preload["']([^>]*?)>/gi,
        (match, before, after) => {
          // Check if 'as' attribute is missing
          if (!match.includes('as=')) {
            // Determine the type based on href
            if (match.includes('.css')) {
              return `<link${before}rel="preload"${after} as="style">`;
            } else if (match.includes('.js')) {
              return `<link${before}rel="preload"${after} as="script">`;
            }
          }
          return match;
        }
      );
    },
  };
};

export default defineConfig({
  plugins: [
    react(),
    fixPreloadPlugin(),
  ],
  base: './', // Use relative paths for Chrome extension
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Disable preload links in favor of modulepreload
        manualChunks: undefined,
      },
    },
    sourcemap: false,
    minify: 'esbuild',
    // Disable CSS code splitting to prevent unused preload warnings
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    strictPort: true,
  },
});

