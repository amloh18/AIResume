# Consistent CV Checking Logic Implementation

## 🎯 **Requirement**

**All authentication methods (Firebase and NextAuth) should:**
- **Check if CV count >= 1** → Route to `/dashboard`
- **Check if CV count = 0** → Route to `/onboarding?step=1` (Personal Information page)

## 🔧 **Fixes Implemented**

### **1. LoginModal.tsx - Manual Email Login**

**Before:** Direct redirect to dashboard without CV check
**After:** Consistent CV checking logic

```javascript
// Check if user has CVs before deciding where to route
try {
  console.log('🔍 Checking CVs for NextAuth user:', session.user.id);
  const response = await fetch(`/api/cvs?userId=${session.user.id}`);
  const result = await response.json();
  
  if (result.success && result.data.data && result.data.data.length > 0) {
    // ✅ User has CVs, redirect to dashboard
    window.location.href = '/dashboard';
  } else {
    // 🆕 New user, redirect to onboarding Personal Information page (step 1)
    window.location.href = '/onboarding?step=1';
  }
} catch (error) {
  // Fallback: assume new user
  window.location.href = '/onboarding?step=1';
}
```

### **2. LoginModal.tsx - NextAuth OAuth (Apple)**

**Before:** Direct redirect to dashboard without CV check
**After:** Consistent CV checking logic

```javascript
// Check if user has CVs before deciding where to route
try {
  console.log('🔍 Checking CVs for NextAuth OAuth user:', session.user.id);
  const response = await fetch(`/api/cvs?userId=${session.user.id}`);
  const result = await response.json();
  
  if (result.success && result.data.data && result.data.data.length > 0) {
    // ✅ User has CVs, redirect to dashboard
    window.location.href = '/dashboard';
  } else {
    // 🆕 New user, redirect to onboarding Personal Information page (step 1)
    window.location.href = '/onboarding?step=1';
  }
} catch (error) {
  // Fallback: assume new user
  window.location.href = '/onboarding?step=1';
}
```

### **3. AuthModal.tsx - Google Sign-In (Signup)**

**Before:** Always treated as new user
**After:** Consistent CV checking logic

```javascript
// Check if user has CVs before deciding where to route
try {
  console.log('🔍 Checking CVs for signup user:', userData.id);
  const response = await fetch(`/api/cvs?userId=${userData.id}`);
  const result = await response.json();
  
  if (result.success && result.data.data && result.data.data.length > 0) {
    // ✅ User has CVs, redirect to dashboard
    window.location.href = '/dashboard';
  } else {
    // 🆕 New user, continue with onboarding
    onSuccess(userData);
  }
} catch (error) {
  // Fallback: continue with onboarding
  onSuccess(userData);
}
```

### **4. AuthModal.tsx - Manual Email Signup**

**Before:** Direct call to onSuccess without CV check
**After:** Consistent CV checking logic

```javascript
// Check if user has CVs before deciding where to route
try {
  console.log('🔍 Checking CVs for manual signup user:', userData.id);
  const response = await fetch(`/api/cvs?userId=${userData.id}`);
  const result = await response.json();
  
  if (result.success && result.data.data && result.data.data.length > 0) {
    // ✅ User has CVs, redirect to dashboard
    window.location.href = '/dashboard';
  } else {
    // 🆕 New user, continue with onboarding
    onSuccess(userData);
  }
} catch (error) {
  // Fallback: continue with onboarding
  onSuccess(userData);
}
```

## 🎯 **Consistent Logic Across All Authentication Methods**

### **CV Check Logic:**
```javascript
// Standard CV checking function
const checkCVAndRoute = async (userId) => {
  try {
    const response = await fetch(`/api/cvs?userId=${userId}`);
    const result = await response.json();
    
    if (result.success && result.data.data && result.data.data.length > 0) {
      // ✅ CV count >= 1: Route to dashboard
      window.location.href = '/dashboard';
    } else {
      // 🆕 CV count = 0: Route to onboarding step 1
      window.location.href = '/onboarding?step=1';
    }
  } catch (error) {
    // Fallback: assume new user
    window.location.href = '/onboarding?step=1';
  }
};
```

### **Authentication Methods Covered:**

1. **✅ Firebase Google Sign-In** (LoginModal)
2. **✅ NextAuth Manual Email Login** (LoginModal)
3. **✅ NextAuth OAuth (Apple)** (LoginModal)
4. **✅ Firebase Google Sign-In** (AuthModal - Signup)
5. **✅ NextAuth Manual Email Signup** (AuthModal)

## 📊 **Expected Behavior**

### **All Authentication Methods Now:**

#### **Existing Users (CV count >= 1):**
- **✅ Route to:** `/dashboard`
- **✅ Access:** Full dashboard features
- **✅ No onboarding:** Skip onboarding flow

#### **New Users (CV count = 0):**
- **✅ Route to:** `/onboarding?step=1` (Personal Information page)
- **✅ Skip:** Role selection step
- **✅ Complete:** Onboarding flow from Personal Information

## 🚀 **Testing Instructions**

### **Test All Authentication Methods:**

#### **1. Google Sign-In (Existing User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → "Continue with Google"
3. **Expected:** Redirect to `/dashboard`

#### **2. Google Sign-In (New User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Sign Up" → "Continue with Google"
3. **Expected:** Redirect to `/onboarding?step=1`

#### **3. Manual Email Login (Existing User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → Enter email/password
3. **Expected:** Redirect to `/dashboard`

#### **4. Manual Email Login (New User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → Enter email/password
3. **Expected:** Redirect to `/onboarding?step=1`

#### **5. Manual Email Signup:**
```bash
npm run dev
```
1. Go to `http://localhost:3000/onboarding`
2. Select role → "Create Account with Email"
3. **Expected:** Redirect based on CV count

## 🔍 **Console Logs to Monitor**

```javascript
// CV check logs (all authentication methods)
🔍 Checking CVs for [method] user: [userId]
🔍 CV check result: [result]

// Routing decisions
✅ User has CVs, redirecting to dashboard
🆕 New user, redirecting to onboarding Personal Information page
```

## 📁 **Files Modified**

1. **`src/components/auth/LoginModal.tsx`** - Fixed manual email login and NextAuth OAuth
2. **`src/components/onboarding/AuthModal.tsx`** - Fixed Google sign-in and manual signup

## 🎉 **Benefits**

1. **✅ Consistent Behavior:** All authentication methods follow the same logic
2. **✅ Proper Routing:** Users go to the right page based on CV count
3. **✅ No Role Selection for Authenticated Users:** Skip unnecessary step
4. **✅ Better UX:** Seamless experience regardless of authentication method
5. **✅ Reliable Fallbacks:** Graceful handling of API errors

---

**🎉 Consistent CV checking logic implemented across all authentication methods!**
