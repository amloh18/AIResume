# Step 2 Routing Debugging and Fix

## 🐛 **Issue Identified**

**Problem:** Login was routing to step 2 but still showing role selector and signup modal.

**Root Cause:** The `renderStep` function was not properly handling authenticated users on step 2.

## 🔍 **Debugging Steps**

### **1. Authentication Check Issue**

**Problem:** The authentication check was only looking for `session?.user` but not Firebase users in localStorage.

**Fix:** Updated authentication check to include both NextAuth and Firebase users.

```javascript
// Before
if (session?.user && state.currentStep === 2) {
  return <PersonalInfoStep onNext={nextStep} />;
}

// After
const isAuthenticated = session?.user || (typeof window !== 'undefined' && localStorage.getItem('user'));

if (isAuthenticated && state.currentStep === 2) {
  return <PersonalInfoStep onNext={nextStep} />;
}
```

### **2. Step Parameter Handling Issue**

**Problem:** Step parameter handling was only in the NextAuth section, not Firebase section.

**Fix:** Added step parameter handling for Firebase users.

```javascript
// Before (Firebase section)
if (state.currentStep === 0) {
  dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
}

// After (Firebase section)
if (state.currentStep === 0 && (stepParam === '2' || !stepParam)) {
  dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
}
```

### **3. RenderStep Logic Issue**

**Problem:** The renderStep function wasn't properly handling step 2 for authenticated users.

**Fix:** Added explicit handling for step 2 with authenticated users.

```javascript
// Added explicit step 2 handling
if (isAuthenticated && state.currentStep === 2) {
  console.log('✅ renderStep - User authenticated on step 2, showing PersonalInfoStep');
  return <PersonalInfoStep onNext={nextStep} />;
}
```

## 🛠️ **Fixes Implemented**

### **1. Updated Authentication Check**

**Files Modified:** `src/app/onboarding/page.tsx`

**Changes:**
```javascript
// Check if user is authenticated (either NextAuth session or Firebase localStorage)
const isAuthenticated = session?.user || (typeof window !== 'undefined' && localStorage.getItem('user'));

// Use isAuthenticated instead of session?.user
if (isAuthenticated && state.currentStep === 2) {
  return <PersonalInfoStep onNext={nextStep} />;
}
```

### **2. Added Step Parameter Handling for Firebase**

**Files Modified:** `src/app/onboarding/page.tsx`

**Changes:**
```javascript
// Skip to CV setup step (step 2) if user is already authenticated
// or if step parameter is provided
if (state.currentStep === 0 && (stepParam === '2' || !stepParam)) {
  console.log('Onboarding page - moving to step 2');
  dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
}
```

### **3. Added Debugging Logs**

**Files Modified:** `src/app/onboarding/page.tsx`

**Changes:**
```javascript
console.log('🔍 renderStep - isAuthenticated:', isAuthenticated);
console.log('🔍 renderStep - state.currentStep:', state.currentStep);
console.log('🔍 renderStep - session?.user:', session?.user);
console.log('🔍 renderStep - localStorage user:', typeof window !== 'undefined' ? localStorage.getItem('user') : 'N/A');
```

## 🎯 **Expected Behavior After Fix**

### **Login Flow:**
1. **User logs in** (Google, email, Apple)
2. **CV check happens** - API call to `/api/cvs?userId=${userId}`
3. **Smart routing:**
   - **✅ CV count >= 1** → `/dashboard`
   - **🆕 CV count = 0** → `/onboarding?step=2` (Personal Information)

### **Onboarding Page Behavior:**
1. **URL:** `/onboarding?step=2`
2. **Authentication check:** ✅ Recognizes both NextAuth and Firebase users
3. **Step handling:** ✅ Sets currentStep to 2
4. **RenderStep:** ✅ Shows PersonalInfoStep instead of RoleSelection
5. **Signup modal:** ✅ Hidden for authenticated users

## 🚀 **Testing Instructions**

### **Test Step 2 Routing:**

#### **1. Google Sign-In (New User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → "Continue with Google"
3. **Expected:** 
   - URL: `/onboarding?step=2`
   - Shows: Personal Information page
   - No role selector
   - No signup modal

#### **2. Manual Email Login (New User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → Enter email/password
3. **Expected:**
   - URL: `/onboarding?step=2`
   - Shows: Personal Information page
   - No role selector
   - No signup modal

## 🔍 **Console Logs to Monitor**

```javascript
// Authentication status
🔍 renderStep - isAuthenticated: true/false
🔍 renderStep - state.currentStep: 0/1/2/3/4/5
🔍 renderStep - session?.user: [session data or null]
🔍 renderStep - localStorage user: [user data or null]

// Step handling
✅ renderStep - User authenticated on step 2, showing PersonalInfoStep
Onboarding page - moving to step 2

// CV check logs
🔍 Checking CVs for [method] user: [userId]
🆕 New user, redirecting to onboarding Personal Information page (step 2)
```

## 📁 **Files Modified**

1. **`src/app/onboarding/page.tsx`** - Fixed authentication check, step parameter handling, and renderStep logic

## 🎉 **Benefits**

1. **✅ Proper Authentication Check:** Recognizes both NextAuth and Firebase users
2. **✅ Correct Step Handling:** Properly handles step 2 parameter
3. **✅ Skip Role Selection:** Authenticated users skip role selection
4. **✅ No Signup Modal:** Hidden for authenticated users
5. **✅ Debugging:** Added console logs for troubleshooting

---

**🎉 Step 2 routing now properly shows Personal Information page for authenticated users!**
