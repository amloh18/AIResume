# Chrome Extension Development Support

## Overview
The CVCircle Chrome Extension now fully supports development environments running on `localhost:3000` and other local development variants. This ensures seamless authentication and job capture during development.

## Development Environment Support

### Supported Local Development URLs
- **Primary**: `http://localhost:3000`
- **Alternative**: `http://127.0.0.1:3000`
- **Custom Domain**: `http://cvcircle.local:3000`
- **Production**: `https://www.cvcircle.io`

### Environment Detection Logic

The extension automatically detects the correct environment using multiple methods:

#### 1. Cookie Domain Detection
```javascript
// Background script checks for cookies from different domains
const devDomains = ['localhost', '127.0.0.1', 'cvcircle.local'];
const prodDomains = ['www.cvcircle.io', 'cvcircle.io'];
```

#### 2. URL Pattern Recognition
```javascript
// Content script detects current domain and adjusts API calls
const isLocalhost = currentDomain.includes('localhost') || 
                   currentDomain.includes('127.0.0.1') ||
                   currentDomain.includes('cvcircle.local');

const apiBaseUrl = isLocalhost ? 
  (currentDomain.includes('127.0.0.1') ? 'http://127.0.0.1:3000' : 'http://localhost:3000') :
  'https://www.cvcircle.io';
```

#### 3. Dynamic API URL Selection
```javascript
// Determine correct API URL based on cookie domain
let apiBaseUrl = API_BASE_URL;
if (sessionCookie.domain.includes('localhost') || 
    sessionCookie.domain.includes('127.0.0.1') || 
    sessionCookie.domain.includes('cvcircle.local')) {
  apiBaseUrl = sessionCookie.domain.includes('127.0.0.1') ? 
    'http://127.0.0.1:3000' : 
    sessionCookie.domain.includes('cvcircle.local') ?
    'http://cvcircle.local:3000' :
    'http://localhost:3000';
}
```

## Development Workflow

### 1. Starting Development
1. Ensure your CVCircle development server is running on `localhost:3000`
2. Load the chrome extension in development mode
3. The extension will automatically detect the development environment

### 2. Authentication in Development
1. **Login Process**:
   - Click "Login to CVCircle" in extension popup
   - Extension opens `http://localhost:3000/sign-in` (not production)
   - Sign in with your development credentials
   - Extension automatically captures session from local server

2. **Session Detection**:
   - Extension monitors localhost cookies
   - Automatically syncs authentication state
   - No manual refresh required

### 3. Job Capture in Development
- Works exactly like production
- Saves jobs to your local development database
- Uses local API endpoints
- Maintains full functionality

## Files Enhanced for Development Support

### 1. `popup.js`
- **Enhanced Detection**: Checks for `localhost:3000`, `127.0.0.1:3000`, `cvcircle.local:3000`
- **Dynamic Login URL**: Opens correct sign-in page based on environment
- **Environment-Specific Session Sync**: Prioritizes local development detection

```javascript
const isCvcircleWebsite = tab.url.includes('cvcircle.io') || 
                          tab.url.includes('localhost:3000') ||
                          tab.url.includes('127.0.0.1:3000') ||
                          tab.url.includes('cvcircle.local');
```

### 2. `content-cvcircle.js`
- **Local Domain Detection**: Detects localhost, 127.0.0.1, and cvcircle.local
- **Dynamic API Calls**: Uses correct API base URL for each environment
- **Environment Logging**: Logs development vs production environment

```javascript
const isLocalhost = currentDomain.includes('localhost') || 
                   currentDomain.includes('127.0.0.1') ||
                   currentDomain.includes('cvcircle.local');

const apiBaseUrl = isLocalhost ? 
  (currentDomain.includes('127.0.0.1') ? 'http://127.0.0.1:3000' : 'http://localhost:3000') :
  'https://www.cvcircle.io';
```

### 3. `background.js`
- **Multi-Domain Cookie Detection**: Checks cookies from all localhost variants
- **Environment-Specific API URLs**: Uses correct base URL for each environment
- **Smart Cookie Matching**: Matches API URL to cookie domain

```javascript
// Check for localhost cookies (development) - multiple variants
const devDomains = ['localhost', '127.0.0.1', 'cvcircle.local'];
```

## Development Testing

### Testing Authentication Flow
1. **Start Development Server**:
   ```bash
   npm run dev
   # Server should be running on http://localhost:3000
   ```

2. **Load Extension in Chrome**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Test Login**:
   - Open extension popup
   - Click "Login to CVCircle"
   - Should open `http://localhost:3000/sign-in`
   - Sign in with development credentials
   - Return to extension - should be automatically authenticated

4. **Verify Environment Detection**:
   - Check browser console for development environment logs
   - Should see: "✅ Development environment detected (localhost)"
   - API calls should go to `http://localhost:3000`

### Testing Job Capture
1. **Navigate to Job Site**:
   - Visit LinkedIn, Indeed, etc.
   - Find a job posting

2. **Capture Job**:
   - Extension should detect job automatically
   - Click extension icon
   - Should show job preview with all captured data

3. **Save Job**:
   - Click "Save Job"
   - Should save to local development database
   - Check local MongoDB for new job entry

## Common Development Issues & Solutions

### Issue 1: Extension Still Opening Production Login
**Solution**: Ensure your development server is running and cookies are being set on localhost domain.

### Issue 2: Session Not Capturing from Localhost
**Solution**: 
- Check that your development NextAuth configuration allows localhost
- Verify cookies are being set on `localhost:3000` domain
- Check browser console for environment detection logs

### Issue 3: API Calls Going to Production
**Solution**: 
- Extension should auto-detect localhost cookies
- If not, try refreshing the extension or restarting Chrome
- Check background script logs for environment detection

## Environment-Specific Configuration

### Development Server Requirements
- Must run on port 3000
- Must have NextAuth configured for localhost domain
- Must have proper CORS settings for chrome-extension://

### NextAuth Configuration for Development
```javascript
// In your NextAuth config
{
  providers: [...],
  pages: {
    signIn: '/auth/signin',
  },
  cookies: {
    // Ensure cookies work on localhost
  },
  callbacks: {
    // Allow localhost in callbacks
  }
}
```

## Benefits for Development

### 1. Seamless Development Experience
- No need to manually switch between development and production
- Extension automatically adapts to your environment
- Session management works consistently

### 2. Full Feature Parity
- All extension features work in development
- Job capture and saving function identically
- Authentication flows are identical

### 3. Better Debugging
- Clear environment detection logging
- Separate development and production logs
- Easy to verify correct API endpoints

## Migration from Production to Development

If you were previously using the extension with production:

1. **Clear Extension Storage**:
   ```javascript
   // In extension console
   chrome.storage.local.clear();
   ```

2. **Restart Chrome**: Ensures fresh cookie detection

3. **Login on Development**: Extension will now detect localhost environment

4. **Verify Environment**: Check console logs for development detection

## Conclusion

The chrome extension now provides full development support, allowing seamless authentication and job capture from your local development server. The automatic environment detection ensures you always use the correct API endpoints and authentication methods, making development and testing much more efficient.