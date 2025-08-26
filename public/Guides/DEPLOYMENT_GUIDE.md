# Appwrite Deployment Guide

## Fixing Tailwind CSS Build Issues

### Problem
The build fails with: `Error: Cannot find module 'tailwindcss'` when deploying to Appwrite.

### Root Cause
- Appwrite's build environment may not have the same Node.js version or package resolution as your local environment
- Multiple lockfiles causing package resolution conflicts
- PostCSS pipeline can't resolve Tailwind CSS during the build process

### Solution Steps

#### 1. Appwrite Build Configuration

**Runtime Settings:**
- **Runtime:** Node.js 18.x or 20.x (Next.js 15 requires Node 18+)
- **Entry Point:** `npm run build`
- **Build Command:** `npm ci && npm run build`

**Environment Variables:**
```
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

#### 2. Build Commands for Appwrite

**Option A: Use the deployment script**
```bash
chmod +x scripts/deploy-build.sh && ./scripts/deploy-build.sh
```

**Option B: Manual build commands**
```bash
# Clean install dependencies
npm ci --prefer-offline --no-audit

# Verify critical dependencies
npm list tailwindcss postcss autoprefixer

# Build the application
npm run build
```

#### 3. Critical Files to Include

Ensure these files are committed and deployed:

**Required Configuration Files:**
- `package.json` (with engines specification)
- `package-lock.json` (single lockfile only)
- `tailwind.config.js`
- `postcss.config.js`
- `.npmrc`
- `next.config.ts`

**Critical Dependencies (in devDependencies):**
```json
{
  "devDependencies": {
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.20"
  }
}
```

#### 4. Verification Steps

**Before Deploying:**
1. Remove any duplicate lockfiles (keep only `package-lock.json`)
2. Ensure `node_modules` is in `.gitignore`
3. Verify all config files are committed

**After Deploying:**
1. Check build logs for Tailwind CSS compilation
2. Verify PostCSS plugins are loaded correctly
3. Confirm no "Cannot find module" errors

#### 5. Troubleshooting

**If build still fails:**

1. **Check Node.js version in Appwrite:**
   - Ensure it's Node 18+ (Next.js 15 requirement)
   - Add `"engines": { "node": ">=18.0.0 <21.0.0" }` to package.json

2. **Force clean install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

3. **Verify PostCSS configuration:**
   - Ensure `postcss.config.js` includes `tailwindcss` plugin
   - Check that `tailwind.config.js` has correct content paths

4. **Check for conflicting dependencies:**
   ```bash
   npm ls tailwindcss postcss autoprefixer
   ```

#### 6. Alternative Solutions

**If the issue persists:**

1. **Move Tailwind to dependencies:**
   ```bash
   npm uninstall tailwindcss postcss autoprefixer
   npm install tailwindcss postcss autoprefixer
   ```

2. **Use explicit PostCSS configuration:**
   ```javascript
   // postcss.config.js
   module.exports = {
     plugins: [
       require('tailwindcss'),
       require('autoprefixer'),
     ],
   }
   ```

3. **Disable CSS optimization temporarily:**
   ```javascript
   // next.config.ts
   const nextConfig = {
     experimental: {
       optimizeCss: false, // Disable temporarily
     },
   }
   ```

### Expected Build Output

A successful build should show:
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

### Common Issues and Solutions

1. **Multiple lockfiles warning:**
   - Remove duplicate `package-lock.json` files
   - Keep only the one in your project root

2. **Peer dependency warnings:**
   - Use `.npmrc` with `legacy-peer-deps=true`
   - This is already configured in the project

3. **Module resolution issues:**
   - Ensure all dependencies are in the correct section (dependencies vs devDependencies)
   - Verify import paths are correct

### Support

If you continue to experience issues:
1. Check Appwrite's build logs for specific error messages
2. Verify your Appwrite project settings match the recommended configuration
3. Consider using Appwrite's web hosting instead of functions for Next.js apps
