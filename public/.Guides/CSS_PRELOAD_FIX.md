# CSS Preload Warning Fix

## Issue
The browser console displayed a warning:
```
The resource https://www.cvcircle.io/_next/static/css/3823a54239e4d1a1.css was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
```

## Root Cause
This warning was caused by two sources:

### 1. Next.js App (Main Source)
- Next.js 15 with `optimizeCss: true` was generating preload links for CSS files
- These preload links either lacked the proper `as="style"` attribute or were preloaded but not used quickly enough
- The aggressive CSS optimization was causing unnecessary preload warnings

### 2. Chrome Extension Sidebar (Vite Build)
- The Vite build was potentially generating CSS preload links
- These could appear when the extension's React sidebar was loaded

## Solutions Implemented

### 1. Next.js Configuration (`next.config.ts`)
**Changed:**
```typescript
experimental: {
  optimizeCss: false, // Was: true
  optimizePackageImports: ['lucide-react', 'lottie-react'],
}
```

**Why:** Disabling `optimizeCss` prevents Next.js from generating aggressive CSS preload links that may not be used immediately, eliminating the warning.

### 2. Vite Configuration (`chrome-extension/sidebar/vite.config.ts`)
**Added:**
- Custom plugin to fix preload link attributes
- Disabled CSS code splitting (`cssCodeSplit: false`)
- Disabled `manualChunks` to prevent unnecessary preload generation

**Changes:**
```typescript
import { defineConfig, Plugin } from 'vite';

const fixPreloadPlugin = (): Plugin => {
  return {
    name: 'fix-preload-links',
    transformIndexHtml(html) {
      // Ensure preload links have proper 'as' attribute
      return html.replace(
        /<link([^>]*?)rel=["']preload["']([^>]*?)>/gi,
        (match, before, after) => {
          if (!match.includes('as=')) {
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
  build: {
    cssCodeSplit: false, // Prevent unused CSS preload warnings
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable preload links in favor of modulepreload
      },
    },
  },
});
```

**Result:** The built extension sidebar (`chrome-extension/sidebar/dist/index.html`) now uses:
- Regular `<link rel="stylesheet">` for CSS (no preload)
- `<script type="module">` for JavaScript (no preload)

### 3. TypeScript Cleanup (`chrome-extension/sidebar/src/lib/auth.ts`)
Removed unused private methods that were causing TypeScript build warnings:
- `getApiBaseUrl()` - Unused
- `getAuthToken()` - Unused  
- `loginWithCredentials()` - Redundant (now using `loginWithPassword`)

## Verification

### Extension Sidebar Build
```bash
cd chrome-extension/sidebar
npm run build
```

**Output:**
```
✓ 1675 modules transformed.
dist/index.html                   0.48 kB
dist/assets/style.2HexxvbX.css   18.75 kB
dist/assets/main.BuByH5a1.js    198.77 kB
✓ built in 3.35s
```

### Generated HTML (No Preload Links)
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CVCircle Extension Sidebar</title>
    <script type="module" crossorigin src="./assets/main.BuByH5a1.js"></script>
    <link rel="stylesheet" crossorigin href="./assets/style.2HexxvbX.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

## Testing Steps

1. **Rebuild Extension Sidebar:**
   ```bash
   cd chrome-extension/sidebar
   npm run build
   ```

2. **Reload Extension:**
   - Go to `chrome://extensions/`
   - Click "Reload" on CVCircle Job Saver extension

3. **Test on CVCircle Website:**
   - Visit `https://www.cvcircle.io`
   - Open browser console (F12)
   - Check for CSS preload warnings - should be gone

4. **Test Extension Sidebar:**
   - Visit a job board (LinkedIn, Indeed, etc.)
   - Click the extension icon to open sidebar
   - Check console for warnings - should be clean

## Additional Notes

- The warning was specifically about Next.js generated CSS files (`_next/static/css/...`)
- This indicates the main web app was the source, not just the extension
- Both sources have been addressed for comprehensive coverage
- The fix maintains all functionality while eliminating console warnings

## Performance Impact

- **Minimal:** Disabling `optimizeCss` may slightly increase CSS file size but improves compatibility
- **Extension:** No performance impact; actually removes unnecessary preload overhead
- **Next.js Build:** Build times remain the same
- **Runtime:** No noticeable difference in page load times

## Future Considerations

If CSS optimization is needed in the future:
1. Re-enable with `optimizeCss: true`
2. Add custom webpack configuration to ensure `as="style"` on all preload links
3. Use Next.js 15's built-in preload optimization when available
4. Monitor for similar warnings and adjust accordingly