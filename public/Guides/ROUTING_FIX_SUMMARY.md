# Authentication Routing and Signup Modal Fix

## 🐛 Issues Fixed

1. **Incorrect routing after sign-in** - Users were being routed to role selector instead of dashboard or personal information page
2. **Signup modal showing for authenticated users** - Signup modal was appearing for users who were already authenticated

## 🔧 Root Cause Analysis

### **Issue 1: Incorrect Routing After Sign-In**

**Problem:** After successful authentication (Google or email), users were being routed to the role selector step (step 0) instead of:
- **Dashboard** if they have existing CVs
- **Personal Information page** (step 1) if they're new users

**Root Cause:** The `handleAuthSuccess` and `handleLoginSuccess` functions in `src/app/onboarding/page.tsx` were calling `nextStep()` immediately without checking if the user has existing CVs.

### **Issue 2: Signup Modal Showing for Authenticated Users**

**Problem:** The signup modal in the onboarding page was showing for users who were already authenticated through Google or email login.

**Root Cause:** The modal condition only checked for NextAuth session (`!session?.user`) but didn't check for Firebase users stored in localStorage.

## 🛠️ Fixes Implemented

### **1. Fixed Authentication Routing Logic**

**Files Modified:** `src/app/onboarding/page.tsx`

**Changes:**
```javascript
// Before: Immediate nextStep() call
const handleAuthSuccess = (userData: any) => {
  // ... setup user data
  nextStep(); // ❌ Always went to next step
};

// After: Check CVs first, then route accordingly
const handleAuthSuccess = async (userData: any) => {
  // ... setup user data
  
  // Check if user has CVs before deciding where to route
  try {
    const response = await fetch(`/api/cvs?userId=${userData.id}`);
    const result = await response.json();
    
    if (result.success && result.data.data && result.data.data.length > 0) {
      // ✅ User has CVs, redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      // ✅ New user, continue with onboarding
      sessionStorage.setItem('needsCVSetup', 'true');
      nextStep();
    }
  } catch (error) {
    // ✅ Fallback: continue with onboarding
    sessionStorage.setItem('needsCVSetup', 'true');
    nextStep();
  }
};
```

**Same logic applied to `handleLoginSuccess` function.**

### **2. Fixed Signup Modal Condition**

**Files Modified:** `src/app/onboarding/page.tsx`

**Changes:**
```jsx
// Before: Only checked NextAuth session
{!session?.user && (
  <SignupModal />
  <LoginModal />
)}

// After: Check both NextAuth session and Firebase localStorage
{!session?.user && !(typeof window !== 'undefined' && localStorage.getItem('user')) && (
  <SignupModal />
  <LoginModal />
)}
```

## 🎯 How It Works Now

### **Authentication Flow (Fixed):**

1. **User signs in** (Google or email)
2. **Authentication succeeds** and user data is stored
3. **CV check happens** - API call to `/api/cvs?userId=${userId}`
4. **Smart routing based on CV status:**
   - **✅ Has CVs** → Redirect to `/dashboard`
   - **🆕 No CVs** → Continue with onboarding (Personal Information page)
5. **Signup modal hidden** for authenticated users

### **Signup Modal Logic (Fixed):**

- **✅ Hidden for:** NextAuth users (`session?.user`)
- **✅ Hidden for:** Firebase users (`localStorage.getItem('user')`)
- **✅ Shown for:** Non-authenticated users only

## 📊 Expected Behavior

### **After Google Sign-In:**

1. **Existing Users with CVs:**
   - ✅ Redirected to `/dashboard`
   - ✅ No signup modal shown
   - ✅ Can access all features

2. **New Users without CVs:**
   - ✅ Redirected to `/onboarding?step=1` (Personal Information)
   - ✅ No signup modal shown
   - ✅ Can complete onboarding flow

### **After Email Login:**

1. **Existing Users with CVs:**
   - ✅ Redirected to `/dashboard`
   - ✅ No signup modal shown

2. **New Users without CVs:**
   - ✅ Redirected to `/onboarding?step=1` (Personal Information)
   - ✅ No signup modal shown

### **Signup Modal Behavior:**

- **✅ Hidden** for all authenticated users (Google or email)
- **✅ Shown** only for non-authenticated users on role selection step
- **✅ Proper routing** after successful signup

## 🚀 Testing Instructions

### **1. Test Google Sign-In (Existing User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → "Continue with Google"
3. **Expected:** Redirect to `/dashboard` (if user has CVs)

### **2. Test Google Sign-In (New User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Sign Up" → "Continue with Google"
3. **Expected:** Redirect to `/onboarding?step=1` (Personal Information)

### **3. Test Email Login:**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → Enter email/password
3. **Expected:** Proper routing based on CV status

### **4. Test Signup Modal Visibility:**
```bash
npm run dev
```
1. Go to `http://localhost:3000/onboarding`
2. **Expected:** Signup modal shows for non-authenticated users
3. Sign in with Google or email
4. **Expected:** Signup modal hidden for authenticated users

## 🔍 Debugging

### **Console Logs to Watch:**

```javascript
// CV check logs
🔍 Checking CVs for user: [userId]
🔍 CV check result: [result]

// Routing decisions
✅ User has CVs, redirecting to dashboard
🆕 New user, continuing with onboarding

// Authentication status
🔍 Session user: [session data]
🔍 LocalStorage user: [user data]
```

### **Common Issues:**

1. **Still going to role selector:**
   - Check browser console for CV check logs
   - Verify API response format
   - Clear browser cache and try again

2. **Signup modal still showing:**
   - Check if user data exists in localStorage
   - Verify session status
   - Check authentication state

## 📁 Files Modified

1. **`src/app/onboarding/page.tsx`** - Fixed routing logic and signup modal condition

## 🎉 Benefits

1. **✅ Correct Routing:** Users go to the right page based on their CV status
2. **✅ No Signup Modal for Authenticated Users:** Clean UX for logged-in users
3. **✅ Consistent Behavior:** Same logic for Google and email authentication
4. **✅ Better UX:** Users don't see unnecessary signup prompts
5. **✅ Proper Flow:** New users complete onboarding, existing users go to dashboard

---

**🎉 Authentication routing and signup modal issues fixed!**
