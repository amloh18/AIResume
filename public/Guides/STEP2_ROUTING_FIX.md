# Login Routing Fix: Step 2 Onboarding

## 🎯 **Requirement**

**Login (Firebase, NextAuth) should:**
- **Check if CV count >= 1** → Route to `/dashboard`
- **Check if CV count = 0** → Route to **step 2** onboarding (Personal Information page)

## 🔧 **Issue Fixed**

**Problem:** Login was routing to step 1 onboarding instead of step 2.

**Root Cause:** All login methods were redirecting to `/onboarding?step=1` instead of `/onboarding?step=2`.

## 🛠️ **Fixes Implemented**

### **1. LoginModal.tsx - All Authentication Methods**

**Updated routing logic for:**
- Firebase Google Sign-In
- NextAuth Manual Email Login  
- NextAuth OAuth (Apple)

**Changes:**
```javascript
// Before
window.location.href = '/onboarding?step=1';

// After
window.location.href = '/onboarding?step=2';
```

### **2. Onboarding Page - Step Handling**

**Updated step parameter handling:**
```javascript
// Before
if (state.currentStep === 0 && (stepParam === '1' || !stepParam)) {
  dispatch({ type: 'SET_CURRENT_STEP', payload: 1 });
}

// After
if (state.currentStep === 0 && (stepParam === '2' || !stepParam)) {
  dispatch({ type: 'SET_CURRENT_STEP', payload: 2 });
}
```

### **3. Onboarding Page - Step Mapping**

**Updated step mapping to handle step 2 correctly:**
```javascript
// Before
case 2: return <ExperienceStep onNext={nextStep} onBack={prevStep} />;

// After
case 2: return <PersonalInfoStep onNext={nextStep} />; // Step 2 is Personal Information
case 3: return <ExperienceStep onNext={nextStep} onBack={prevStep} />;
case 4: return <EducationStep onNext={nextStep} onBack={prevStep} />;
case 5: return <CompletionStep onComplete={handleComplete} onBack={prevStep} isLoading={isLoading} />;
```

## 🎯 **Updated Onboarding Flow**

### **Step Structure:**
```javascript
case 0: RoleSelection           // Step 1: Role Selection
case 1: PersonalInfoStep       // Step 2: Personal Information (legacy)
case 2: PersonalInfoStep       // Step 3: Personal Information (new)
case 3: ExperienceStep         // Step 4: Experience
case 4: EducationStep          // Step 5: Education
case 5: CompletionStep         // Step 6: Completion
```

### **Login Flow:**
1. **User logs in** (Google, email, Apple)
2. **CV check happens** - API call to `/api/cvs?userId=${userId}`
3. **Smart routing:**
   - **✅ CV count >= 1** → `/dashboard`
   - **🆕 CV count = 0** → `/onboarding?step=2` (Personal Information)

## 📊 **Expected Behavior**

### **After Login (All Methods):**

#### **Existing Users (CV count >= 1):**
- **✅ Route to:** `/dashboard`
- **✅ Access:** Full dashboard features
- **✅ No onboarding:** Skip onboarding flow

#### **New Users (CV count = 0):**
- **✅ Route to:** `/onboarding?step=2` (Personal Information page)
- **✅ Skip:** Role selection step (step 1)
- **✅ Start from:** Personal Information (step 2)
- **✅ Complete:** Remaining onboarding steps (3, 4, 5)

## 🚀 **Testing Instructions**

### **Test Login Routing:**

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
2. Click "Login" → "Continue with Google"
3. **Expected:** Redirect to `/onboarding?step=2` (Personal Information)

#### **3. Manual Email Login (New User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → Enter email/password
3. **Expected:** Redirect to `/onboarding?step=2` (Personal Information)

#### **4. Apple Sign-In (New User):**
```bash
npm run dev
```
1. Go to `http://localhost:3000`
2. Click "Login" → "Continue with Apple"
3. **Expected:** Redirect to `/onboarding?step=2` (Personal Information)

## 🔍 **Console Logs to Monitor**

```javascript
// CV check logs
🔍 Checking CVs for [method] user: [userId]
🔍 CV check result: [result]

// Routing decisions
✅ User has CVs, redirecting to dashboard
🆕 New user, redirecting to onboarding Personal Information page (step 2)

// Onboarding step handling
Onboarding page - moving to step 2
```

## 📁 **Files Modified**

1. **`src/components/auth/LoginModal.tsx`** - Updated all login methods to route to step 2
2. **`src/app/onboarding/page.tsx`** - Updated step parameter handling and step mapping

## 🎉 **Benefits**

1. **✅ Correct Step Routing:** Login routes to step 2 (Personal Information) instead of step 1
2. **✅ Skip Role Selection:** Authenticated users skip unnecessary role selection
3. **✅ Consistent Behavior:** All login methods follow the same routing logic
4. **✅ Better UX:** Users start onboarding from the right step
5. **✅ Proper Flow:** Step 2 → Step 3 → Step 4 → Step 5 → Complete

---

**🎉 Login routing now correctly goes to step 2 onboarding for new users!**
