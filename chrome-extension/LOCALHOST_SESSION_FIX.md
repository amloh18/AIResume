# Chrome Extension Localhost Session Capture Fix

## Problem Identified
The chrome extension was unable to capture sessions from `localhost:3000` because the `content-cvcircle.js` script was not authorized to run on localhost domains in the extension manifest.

## Root Cause
The `manifest.json` file was missing localhost permissions for the CVCircle content script:
- **Issue**: `content-cvcircle.js` only ran on production domains
- **Result**: Session monitoring never activated on localhost:3000
- **Impact**: Users could log in on localhost but extension couldn't detect the session

## Fix Applied

### Updated Manifest Permissions
**File: `chrome-extension/manifest.json`**

#### Before (Missing Localhost Support):
```json
"host_permissions": [
  "https://www.linkedin.com/*",
  "https://www.indeed.com/*",
  // ... other job sites
  "https://localhost:3000/*",  // Wrong protocol (https instead of http)
  "https://www.cvcircle.io/*",
  "https://cvcircle.io/*"
],
```

```json
"content_scripts": [
  {
    "matches": [
      "https://www.cvcircle.io/*",
      "https://cvcircle.io/*"
    ],
    "js": ["content-cvcircle.js"],
    "run_at": "document_end"
  }
]
```

#### After (Fixed with Localhost Support):
```json
"host_permissions": [
  "https://www.linkedin.com/*",
  "https://www.indeed.com/*",
  // ... other job sites
  "http://localhost:3000/*",        // Corrected protocol (http)
  "http://127.0.0.1:3000/*",       // Added 127.0.0.1 support
  "http://cvcircle.local:3000/*",  // Added custom domain support
  "https://www.cvcircle.io/*",
  "https://cvcircle.io/*"
],
```

```json
"content_scripts": [
  {
    "matches": [
      "https://www.cvcircle.io/*",
      "https://cvcircle.io/*",
      "http://localhost:3000/*",        // Added localhost support
      "http://127.0.0.1:3000/*",       // Added 127.0.0.1 support
      "http://cvcircle.local:3000/*"   // Added custom domain support
    ],
    "js": ["content-cvcircle.js"],
    "run_at": "document_end"
  }
]
```

## Technical Details

### What This Fix Enables:
1. **Session Monitoring**: `content-cvcircle.js` now runs on localhost pages
2. **Authentication Detection**: Extension can detect when user logs in on localhost
3. **Session Sync**: Automatically syncs authentication state between localhost and extension
4. **API Calls**: Extension can make authenticated API calls to localhost:3000

### How It Works:
1. **User visits** `http://localhost:3000/sign-in`
2. **Extension loads** `content-cvcircle.js` (now authorized)
3. **Content script detects** the login page
4. **After login**, script monitors session changes
5. **Session detected**, extension background script is notified
6. **Extension updates**, shows authenticated dashboard

## Required Extension Reload

**IMPORTANT**: After updating `manifest.json`, the extension must be reloaded:

1. **Go to Chrome Extensions** (`chrome://extensions/`)
2. **Find CVCircle Job Saver Extension**
3. **Click the reload button** (🔄 icon)
4. **Verify no errors** in extension details

## Testing the Fix

### Step 1: Verify Extension Permissions
1. Open `chrome://extensions/`
2. Click "Details" on CVCircle Job Saver extension
3. Check that it has permissions for:
   - `localhost:3000`
   - `127.0.0.1:3000`
   - `cvcircle.local:3000`

### Step 2: Test Localhost Session Capture
1. **Start development server**: `npm run dev` (should be on localhost:3000)
2. **Open extension popup**
3. **Click "Login to CVCircle"** (should open localhost:3000/sign-in)
4. **Sign in with development credentials**
5. **Return to extension popup**
6. **Check browser console** for localhost session logs:
   ```
   🔍 CVCircle session sync content script loaded
   🔍 Starting CVCircle session monitoring...
   ✅ Session data received: {user: {...}}
   ```

### Step 3: Verify Session Persistence
1. **Close extension popup**
2. **Reopen extension popup**
3. **Should still show authenticated dashboard** (no login required)

## Common Issues & Solutions

### Issue: "Script not loading on localhost"
**Solution**: Ensure extension was reloaded after manifest changes

### Issue: "Session still not captured"
**Solution**: 
- Check browser console for `content-cvcircle.js` loading
- Verify localhost:3000 is running and accessible
- Check extension permissions in `chrome://extensions/`

### Issue: "Wrong login URL still opening"
**Solution**: 
- Clear extension storage: `chrome.storage.local.clear()`
- Reload extension
- Try login again

## Verification Commands

### Check Extension Loading:
```javascript
// In browser console on localhost:3000
console.log('Content script loaded:', typeof content-cvcircle !== 'undefined');
```

### Check Session Detection:
```javascript
// After logging in on localhost:3000
fetch('/api/auth/session', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Session:', data));
```

### Check Extension Storage:
```javascript
// In extension popup console
chrome.storage.local.get(null, console.log);
```

## Benefits of This Fix

### For Development:
- ✅ **Seamless localhost authentication**
- ✅ **No production login required during development**
- ✅ **Full extension functionality on localhost**
- ✅ **Proper session persistence**

### For Users:
- ✅ **Faster development workflow**
- ✅ **No manual session refresh needed**
- ✅ **Consistent experience between dev and prod**
- ✅ **Better debugging capabilities**

## Conclusion

The chrome extension now properly captures sessions from `localhost:3000` due to the fixed manifest permissions. This enables full development support without requiring production login. The session monitoring script (`content-cvcircle.js`) is now authorized to run on all localhost variants and can properly detect and sync authentication state with the extension.

**Next Steps**: 
1. Reload the extension in Chrome
2. Test the localhost session capture flow
3. Verify all extension functionality works on localhost