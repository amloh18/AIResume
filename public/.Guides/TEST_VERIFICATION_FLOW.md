# Verification Flow Test Guide

## Test the Complete Authentication Flow

### Prerequisites
1. Start the development server: `npm run dev`
2. Open browser console (F12) to see debug logs
3. Have access to email account for verification codes

---

## Test 1: New User Sign-up with Email Verification

### Steps:
1. Navigate to `/ai-career-report` or any page that requires authentication
2. Click "Sign Up" or start the AI Career Report flow
3. Enter email address and password
4. Click "Sign Up"
5. Wait for verification code email
6. Enter the 4-digit verification code
7. Observe the console logs and UI

### Expected Results:
✅ Console shows:
```
🔐 Starting atomic signup for: [your-email]
💾 Preserved CV data: {inLocalStorage: true, inSessionStorage: true, dataLength: xxx}
✅ User verified, got session token
🔐 NextAuth sign-in result: {ok: true, ...}
✅ Restored CV data to localStorage after sign-in
```

✅ UI shows:
- "Email verified! Signing you in..."
- "Signed in! Redirecting..."
- Successful redirect to callback URL (e.g., /ai-career-report step 3)

❌ Should NOT show:
- "Verification succeeded but sign-in failed. Redirecting to sign-in..."
- Any infinite loop or redirect cycles

---

## Test 2: CV Data Preservation Through Authentication

### Steps:
1. Go to `/ai-career-report`
2. Upload or manually enter CV data in Step 1
3. Complete CV editing in Step 2
4. Click "Continue to Analysis"
5. If not authenticated, sign up or sign in
6. After authentication, verify Step 3 loads

### Expected Results:
✅ Console shows (in Step 3):
```
📦 Step 3: Loading saved data from localStorage: {hasCvData: true, workCount: x, educationCount: x}
📥 Step 3: Restoring CV data from localStorage
🚀 Starting AI analysis...
📊 CV Data: {hasBasics: true, name: '...', workCount: x, ...}
```

✅ Step 3 displays:
- Loading state with spinner
- CV data is available
- AI Analysis starts automatically
- No "No CV data found" error

❌ Should NOT show:
- "No CV data found. Please go back and complete your CV information."
- "Invalid CV data" error

---

## Test 3: AI Analysis Execution

### Steps:
1. Ensure you're authenticated
2. Ensure CV data is loaded (from Test 2)
3. Observe Step 3 AI Analysis

### Expected Results:
✅ Console shows:
```
🚀 Starting AI analysis...
📊 CV Data: {hasBasics: true, name: '...', workCount: x, educationCount: x, projectsCount: x}
📤 Sending payload to API: {cvDataSize: xxx, hasJobData: false, jobId: null}
📡 AI Analysis response status: 200 OK
📥 AI Analysis result: {success: true, analysis: {...}}
```

✅ UI shows:
- Loading animation/spinner
- Progress indicators
- Analysis results display (or fallback if AI keys not configured)
- No error messages

❌ Should NOT show:
- "AI Analysis failed: 400 Bad Request"
- "Invalid CV data"
- "Failed to process CV data"

---

## Test 4: Manual Sign-in After Failed Auto Sign-in

### Steps:
1. If automatic sign-in fails during verification
2. User should be redirected to sign-in page
3. Manually enter email and password
4. Sign in

### Expected Results:
✅ Console shows:
```
✅ Restored CV data from backup after error
```

✅ After manual sign-in:
- User is authenticated
- CV data is preserved
- Step 3 works correctly

---

## Test 5: Error Recovery

### Steps:
1. Intentionally cause an error (e.g., network disconnect)
2. Observe error handling
3. Reconnect and retry

### Expected Results:
✅ Console shows:
```
❌ Atomic signup error: [error details]
✅ Restored CV data from backup after error
```

✅ UI shows:
- Clear error message (not generic "Failed")
- Option to retry or navigate back
- Data is preserved even after error

---

## Common Issues and Solutions

### Issue: "Verification succeeded but sign-in failed"
**Solution**: This should now be fixed. If you still see this:
1. Check console for specific error
2. Verify atomic-signup endpoint is being called (not verify-and-signin)
3. Check that sessionToken is returned from atomic-signup

### Issue: "No CV data found" in Step 3
**Solution**: 
1. Check localStorage for 'ai-career-report-data' key
2. Check sessionStorage for 'ai-career-report-backup' key
3. Verify console shows "Restored CV data" message
4. If data is missing, go back to Step 1 and re-enter

### Issue: "AI Analysis failed: 400 Bad Request"
**Solution**:
1. Check console for detailed error message
2. Verify CV data structure in console logs
3. Check that cvDataPayload includes all required fields
4. Verify API endpoint logs show proper request body

---

## Debug Tips

### Enable Verbose Logging
All relevant functions now include comprehensive logging:
- 🔐 = Authentication flow
- 💾 = Data preservation
- 📦 = Data loading
- 🚀 = Process starting
- ✅ = Success
- ❌ = Error
- 📊 = Data details
- 📤 = Outgoing request
- 📡 = Response status
- 📥 = Incoming data

### Check Network Tab
1. Open browser DevTools > Network tab
2. Filter by "Fetch/XHR"
3. Look for:
   - `/api/auth/atomic-signup` (should return 200 with sessionToken)
   - `/api/ai/career-analysis` (should return 200 with analysis)

### Check Application Storage
1. Open browser DevTools > Application tab
2. Check Local Storage for key: `ai-career-report-data`
3. Check Session Storage for key: `ai-career-report-backup`
4. Verify data structure is valid JSON

### Server-Side Logs
Check your server console for:
- `🔐 Atomic signup started for: [email]`
- `✅ Code verified and burned`
- `✅ User marked as verified: [userId]`
- `✅ Created one-time session token for NextAuth sign-in`
- `🚀 Starting career analysis...`
- `✅ AI analysis completed successfully`

---

## Success Criteria

All tests should pass with:
1. ✅ No "Verification succeeded but sign-in failed" message
2. ✅ CV data preserved through authentication
3. ✅ AI Analysis executes without 400 errors
4. ✅ Clear error messages when things go wrong
5. ✅ Proper logging for debugging
6. ✅ Successful authentication and redirect

If any test fails, refer to the debug tips above and check the console/network logs.

