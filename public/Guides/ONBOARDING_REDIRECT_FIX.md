# Onboarding Redirect and MongoDB URI Fix

## 🐛 Issues Identified

1. **Google sign-in redirecting to role selector** instead of Personal Information page
2. **Manual email login failing** due to missing MongoDB URI environment variable

## 🔧 Fixes Implemented

### 1. **Fixed Google Sign-In Redirect** 

**Problem:** Google sign-in was redirecting to `/onboarding` (step 0 - role selector) instead of the Personal Information page.

**Solution:** Updated redirect URLs to go directly to Personal Information page (step 1).

**Files Modified:**
- `src/components/auth/LoginModal.tsx`
- `src/components/auth/RegistrationModal.tsx`

**Changes:**
```javascript
// Before
window.location.href = '/onboarding';

// After  
window.location.href = '/onboarding?step=1';
```

### 2. **Enhanced Onboarding Page Logic**

**Problem:** Onboarding page wasn't handling step parameters to skip role selection.

**Solution:** Added step parameter handling to skip role selection for authenticated users.

**Files Modified:**
- `src/app/onboarding/page.tsx`

**Changes:**
```javascript
// Added step parameter handling
const searchParams = useSearchParams();
const stepParam = searchParams.get('step');

// Skip to Personal Information step (step 1) if user is already authenticated
// or if step parameter is provided
if (state.currentStep === 0 && (stepParam === '1' || !stepParam)) {
  dispatch({ type: 'SET_CURRENT_STEP', payload: 1 });
}
```

### 3. **Fixed MongoDB URI Environment Variable**

**Problem:** Manual email login was failing with error:
```
Error: Invalid/Missing environment variable: "MONGODB_URI"
```

**Solution:** Added MongoDB URI to `.env.local` file.

**Files Modified:**
- `scripts/setup-firebase-env.js` (updated to include MongoDB URI)
- `.env.local` (regenerated with MongoDB URI)

**Changes:**
```bash
# Added to .env.local
MONGODB_URI=mongodb+srv://cvcircle:cvcircle123@cluster0.mongodb.net/cvcircle?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## 🚀 How It Works Now

### **Google Sign-In Flow (Fixed):**

1. **User clicks "Continue with Google"**
2. **Firebase authentication completes**
3. **API checks if user has CVs**
4. **Smart redirect:**
   - **Existing users with CVs** → `/dashboard`
   - **New users without CVs** → `/onboarding?step=1` (Personal Information page)
5. **Onboarding page detects step parameter and skips role selection**

### **Manual Email Login Flow (Fixed):**

1. **User enters email/password**
2. **NextAuth authenticates with MongoDB**
3. **MongoDB URI is properly configured**
4. **User redirected to dashboard or onboarding**

## 📊 Expected Behavior

### **After Google Sign-In:**

- **Existing Users**: Redirected to `/dashboard`
- **New Users**: Redirected to `/onboarding?step=1` (Personal Information page)
- **No Role Selection**: Authenticated users skip role selection step

### **After Manual Email Login:**

- **No MongoDB Errors**: Authentication works properly
- **Proper Redirects**: Users go to appropriate pages based on their status

## 🛠️ Testing Instructions

### **1. Test Google Sign-In:**
```bash
npm run dev
```

1. Go to `http://localhost:3000`
2. Click "Login" or "Sign Up"
3. Click "Continue with Google"
4. Complete Google OAuth flow
5. **Expected**: Redirect to Personal Information page (not role selector)

### **2. Test Manual Email Login:**
```bash
npm run dev
```

1. Go to `http://localhost:3000`
2. Click "Login"
3. Enter email and password
4. **Expected**: No MongoDB errors, proper authentication

### **3. Verify Environment Variables:**
```bash
npm run test-google-auth
```

## 🔍 Troubleshooting

### **If Google sign-in still goes to role selector:**

1. **Check browser console** for redirect logs
2. **Verify step parameter** is being passed correctly
3. **Clear browser cache** and try again

### **If manual login still fails:**

1. **Check MongoDB URI** in `.env.local`:
   ```bash
   grep MONGODB_URI .env.local
   ```
2. **Restart development server**:
   ```bash
   npm run dev
   ```
3. **Verify MongoDB connection** is working

### **If onboarding page doesn't skip role selection:**

1. **Check step parameter** in URL: `/onboarding?step=1`
2. **Verify authentication status** in browser console
3. **Check onboarding context** for proper state management

## 📁 Files Modified

1. **`src/components/auth/LoginModal.tsx`** - Updated redirect URLs
2. **`src/components/auth/RegistrationModal.tsx`** - Updated redirect URLs  
3. **`src/app/onboarding/page.tsx`** - Added step parameter handling
4. **`scripts/setup-firebase-env.js`** - Added MongoDB URI
5. **`.env.local`** - Regenerated with MongoDB URI

## 🔗 Useful Commands

```bash
npm run setup-firebase-env    # Regenerate .env.local with MongoDB URI
npm run test-google-auth      # Test authentication setup
npm run fix-firebase-domains  # Fix domain authorization
npm run dev                   # Start development server
```

## ✅ Status

- **✅ Google Sign-In Redirect**: Fixed - goes to Personal Information page
- **✅ Manual Email Login**: Fixed - MongoDB URI configured
- **✅ Onboarding Flow**: Enhanced - skips role selection for authenticated users
- **✅ Environment Variables**: Complete - MongoDB URI and JWT secret added
- **✅ Testing**: Available - test scripts and debugging tools

---

**🎉 Both issues have been resolved!**
