# Quick Test: Logout Fix

## 🚨 IMPORTANT: Clear Your Browser First!

Before testing, you **MUST** clear existing cookies that are causing the issue:

### Option 1: Clear Site Data (Recommended)
1. Open Chrome DevTools: Press `F12` or `Right-click → Inspect`
2. Go to **Application** tab
3. In the left sidebar, find **Storage**
4. Click **"Clear site data"**
5. Check all boxes
6. Click **"Clear site data"** button
7. Close and reopen your browser

### Option 2: Manual Cookie Deletion
1. Open Chrome DevTools: Press `F12`
2. Go to **Application** tab
3. Under **Storage** → **Cookies** → `http://localhost:3000`
4. Delete these cookies manually:
   - `next-auth.session-token`
   - `next-auth.callback-url`
   - `next-auth.csrf-token`
   - `auth-token`
   - `refresh-token`
   - Any other auth-related cookies

5. Under **Local Storage** → `http://localhost:3000`
6. Delete all items

---

## ✅ Test Steps

### 1. Start Fresh
```bash
# Stop any running server
# Press Ctrl+C if server is running

# Start the dev server
npm run dev
```

### 2. Test Login
1. Go to `http://localhost:3000`
2. You should see the **landing page** (not dashboard)
3. Click "Login" or "Get Started"
4. Sign in with your credentials
5. ✅ Verify: You're redirected to dashboard

### 3. Test Logout
1. Click your **avatar** in the top right corner
2. Click **"Sign Out"**
3. ✅ Verify: You're redirected to landing page (`http://localhost:3000`)
4. ✅ Check console logs: Should show logout messages

### 4. Verify Logout Worked
Open DevTools (F12) → **Application** tab:

**Cookies** (`http://localhost:3000`):
- ❌ `next-auth.session-token` should be **GONE**
- ❌ `next-auth.callback-url` should be **GONE**
- ❌ `next-auth.csrf-token` should be **GONE**
- ❌ `auth-token` should be **GONE**
- ❌ `refresh-token` should be **GONE**

**Local Storage** (`http://localhost:3000`):
- ❌ `auth-session` should be **GONE**
- ❌ `user` should be **GONE**

### 5. Test Protected Route Access
1. After logging out, manually navigate to `http://localhost:3000/dashboard`
2. ✅ Verify: You're redirected to **sign-in page**
3. You should **NOT** be able to access dashboard without logging in

### 6. Test Fresh Server Scenario
```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

1. Go to `http://localhost:3000`
2. ✅ Verify: You see **landing page** (not dashboard)
3. ✅ Verify: You're **NOT automatically logged in**

---

## 🐛 If It Still Doesn't Work

### Try Incognito/Private Mode
```
1. Open Chrome Incognito: Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)
2. Go to http://localhost:3000
3. Test login → logout → verify
```

### Check Console Logs
When you logout, you should see these console logs:
```
🔍 Starting comprehensive signout process...
🔍 Calling server-side logout API...
✅ Server-side logout successful
🔍 Signing out from Firebase...
✅ Signed out from Firebase
🔍 Signing out from NextAuth...
✅ Signed out from NextAuth
✅ Cleared all storage
🔍 Landing page detected logout, ensuring session is cleared...
✅ Landing page cleared all session storage
```

### Hard Refresh
After clearing data:
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

---

## ✅ Success Criteria

The fix is working if:
1. ✅ After logout, you land on the homepage (not dashboard)
2. ✅ All NextAuth cookies are deleted
3. ✅ Accessing `/dashboard` redirects you to `/sign-in`
4. ✅ Restarting the server doesn't auto-login you
5. ✅ You can login → logout → login again successfully

---

## 📞 If You Still Have Issues

If the problem persists after:
1. Clearing all browser data
2. Testing in incognito mode
3. Restarting the server

Then check:
- Are you using any browser extensions that manage sessions?
- Is there a service worker caching requests?
- Are you testing with the correct browser?

Share the console logs from:
1. When you click logout
2. When you land on the homepage after logout
3. When you try to access `/dashboard` after logout

This will help identify any remaining issues.

