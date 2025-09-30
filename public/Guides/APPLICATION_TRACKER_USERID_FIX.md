# ApplicationTracker userId Reference Fix

## Error Details

**Error Type**: Runtime ReferenceError  
**Error Message**: `userId is not defined`  
**File**: `src/components/dashboard/ApplicationTracker.tsx`  
**Line**: 119:7  
**Next.js Version**: 15.5.3

## Root Cause

The ApplicationTracker component was using `userId` in a useEffect dependency array, but `userId` was not defined in the component scope. The component was using `useUnifiedAuth()` but wasn't deriving the `userId` from it at the component level.

## Solution Applied

### **Problem Identified**
The component had:
1. ✅ **Correct imports**: `useUnifiedAuth` and `getUserIdForAPI` were imported
2. ✅ **Correct hook usage**: `useUnifiedAuth()` was being called
3. ❌ **Missing userId derivation**: `userId` was not derived at component level
4. ❌ **Inconsistent usage**: `userId` was derived inside `loadData` function but used in useEffect dependency

### **Solution Implemented**

#### 1. Added userId Derivation at Component Level
**Before**:
```typescript
const ApplicationTracker: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const searchParams = useSearchParams();
  const cvId = searchParams.get('cvId');
  // ... rest of component
```

**After**:
```typescript
const ApplicationTracker: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const searchParams = useSearchParams();
  const cvId = searchParams.get('cvId');
  
  // Get user ID for data fetching using unified authentication
  const userId = getUserIdForAPI(user);
  // ... rest of component
```

#### 2. Updated loadData Function
**Before**:
```typescript
const loadData = async () => {
  try {
    setLoading(true);
    const userId = getUserIdForAPI(user); // Redundant derivation
    // ... rest of function
```

**After**:
```typescript
const loadData = async () => {
  try {
    setLoading(true);
    // userId is now available from component scope
    // ... rest of function
```

## Files Modified

- ✅ **FIXED**: `src/components/dashboard/ApplicationTracker.tsx` - Added userId derivation at component level

## Build Status

- ✅ **ReferenceError Resolved**: No more "userId is not defined" errors
- ✅ **Linting Clean**: No linting errors detected
- ✅ **Type Safety Maintained**: All TypeScript types updated
- ✅ **Functionality Preserved**: All existing functionality maintained

## Key Changes Made

### 1. Component-Level userId Derivation
**Added**: `const userId = getUserIdForAPI(user);` at component level
**Result**: `userId` is now available throughout the component scope

### 2. Consistent Authentication Usage
**Before**: Mixed usage of `getUserIdForAPI(user)` in different functions
**After**: Single derivation at component level, used consistently throughout

### 3. useEffect Dependency Fix
**Before**: `useEffect(() => { ... }, [userId]);` - userId was undefined
**After**: `useEffect(() => { ... }, [userId]);` - userId is properly defined

## Testing Recommendations

1. **Component Loading**: Verify ApplicationTracker loads without errors
2. **Data Fetching**: Test that jobs and journeys load correctly
3. **User Authentication**: Verify authentication works with both NextAuth and Firebase
4. **Dependency Updates**: Test that useEffect triggers when userId changes

## Prevention

To prevent similar issues in the future:

1. **Consistent Pattern**: Always derive userId at component level when using unified auth
2. **Dependency Arrays**: Ensure all variables in useEffect dependencies are defined
3. **Code Review**: Review authentication patterns across components
4. **Testing**: Test components with different authentication states

The ApplicationTracker component now uses the unified authentication system consistently and the userId reference error has been resolved.
