# Logout Button Implementation and Debugging

## 🎯 **Requirement**

**Show logout button on onboarding if user is authenticated.**

## 🔍 **Current Implementation**

### **Logout Button Code:**
```jsx
{/* Logout Button - Only show for authenticated users */}
{(() => {
  const isAuthenticated = session?.user || (typeof window !== 'undefined' && localStorage.getItem('user'));
  console.log('🔍 Logout button - isAuthenticated:', isAuthenticated);
  console.log('🔍 Logout button - session?.user:', session?.user);
  console.log('🔍 Logout button - localStorage user:', typeof window !== 'undefined' ? localStorage.getItem('user') : 'N/A');
  return isAuthenticated;
})() && (
  <motion.button
    onClick={async () => {
      try {
        // Check if user is from Firebase (has user data in localStorage)
        if (typeof window !== 'undefined') {
          const userData = localStorage.getItem('user');
          if (userData) {
            // Firebase user - sign out from Firebase
            await signOutUser();
            localStorage.removeItem('user');
            sessionStorage.removeItem('needsCVSetup');
            window.location.href = '/';
          } else {
            // NextAuth user - sign out from NextAuth
            signOut({ callbackUrl: '/' });
          }
        } else {
          // NextAuth user - sign out from NextAuth
          signOut({ callbackUrl: '/' });
        }
      } catch (error) {
        console.error('Logout error:', error);
        // Fallback - clear storage and redirect
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
          sessionStorage.removeItem('needsCVSetup');
          window.location.href = '/';
        }
      }
    }}
    className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 px-3 md:px-4 py-2 rounded-lg shadow-lg hover:shadow-red-500/25"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    whileHover={{ x: 5, scale: 1.05, boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)" }}
    whileTap={{ scale: 0.95 }}
  >
    <LogOut size={16} />
    <span className="hidden sm:inline text-sm font-medium">Logout</span>
  </motion.button>
)}
```

## 🔧 **Issues Identified and Fixed**

### **1. Firebase Authentication Check Issue**

**Problem:** The Firebase authentication check required both `userData` AND `needsCVSetup` to be present.

**Fix:** Removed the `needsCVSetup` requirement for Firebase authentication.

```javascript
// Before
if (userData && needsCVSetup) {
  // Handle Firebase user
}

// After
if (userData) {
  // Handle Firebase user
}
```

### **2. Added Debugging Logs**

**Added console logs to track authentication state:**

```javascript
// In useEffect
console.log('🔍 useEffect - session?.user:', session?.user);
console.log('🔍 useEffect - localStorage user:', typeof window !== 'undefined' ? localStorage.getItem('user') : 'N/A');
console.log('🔍 useEffect - needsCVSetup:', typeof window !== 'undefined' ? sessionStorage.getItem('needsCVSetup') : 'N/A');

// In logout button condition
console.log('🔍 Logout button - isAuthenticated:', isAuthenticated);
console.log('🔍 Logout button - session?.user:', session?.user);
console.log('🔍 Logout button - localStorage user:', typeof window !== 'undefined' ? localStorage.getItem('user') : 'N/A');
```

## 🎯 **Expected Behavior**

### **Logout Button Should Show For:**

1. **✅ NextAuth Users:** `session?.user` exists
2. **✅ Firebase Users:** `localStorage.getItem('user')` exists
3. **✅ Any Authenticated User:** Either NextAuth session or Firebase localStorage

### **Logout Button Should Hide For:**

1. **❌ Non-authenticated Users:** No session or localStorage data
2. **❌ Anonymous Users:** Not logged in

## 🚀 **Testing Instructions**

### **Test Logout Button Visibility:**

#### **1. Google Sign-In (Firebase):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → "Continue with Google"
3. **Expected:** 
   - Redirect to `/onboarding?step=2`
   - Logout button visible in top-right corner
   - Console logs show authentication status

#### **2. Manual Email Login (NextAuth):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → Enter email/password
3. **Expected:**
   - Redirect to `/onboarding?step=2`
   - Logout button visible in top-right corner
   - Console logs show authentication status

#### **3. Non-authenticated User:**
```bash
npm run dev
```
1. Go to `http://localhost:3000/onboarding`
2. **Expected:**
   - No logout button visible
   - Role selector shown
   - Signup modal available

## 🔍 **Console Logs to Monitor**

```javascript
// Authentication status in useEffect
🔍 useEffect - session?.user: [session data or null]
🔍 useEffect - localStorage user: [user data or null]
🔍 useEffect - needsCVSetup: [true/false/null]

// Logout button visibility
🔍 Logout button - isAuthenticated: true/false
🔍 Logout button - session?.user: [session data or null]
🔍 Logout button - localStorage user: [user data or null]
```

## 📁 **Files Modified**

1. **`src/app/onboarding/page.tsx`** - Fixed Firebase authentication check and added debugging logs

## 🎉 **Benefits**

1. **✅ Proper Authentication Check:** Recognizes both NextAuth and Firebase users
2. **✅ Logout Button Visibility:** Shows for all authenticated users
3. **✅ Proper Logout Functionality:** Handles both authentication methods
4. **✅ Debugging:** Added console logs for troubleshooting
5. **✅ User Experience:** Users can easily logout from onboarding

## 🔧 **Logout Functionality**

### **For Firebase Users:**
1. Calls `signOutUser()` from Firebase
2. Removes user data from localStorage
3. Removes needsCVSetup flag from sessionStorage
4. Redirects to home page

### **For NextAuth Users:**
1. Calls `signOut()` from NextAuth
2. Redirects to home page with callback URL

### **Fallback:**
1. Clears localStorage and sessionStorage
2. Redirects to home page

---

**🎉 Logout button now properly shows for all authenticated users on onboarding!**
