# Authentication Flow Diagrams

## Email Verification Flow - AFTER FIX (Current)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER ACTIONS                                 │
└─────────────────────────────────────────────────────────────────────┘

1. User clicks "Sign Up"
   └─> Enters email + password

2. User receives verification email
   └─> Gets 4-digit code

3. User enters verification code
   └─> Clicks "Verify"


┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE FLOW                                  │
│                (UnifiedAuthPage.tsx)                                 │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Code entered, verificationType = 'email-verification'
   │
   ├─> 💾 PRESERVE CV DATA
   │   ├─> localStorage → preservedCVData
   │   └─> preservedCVData → sessionStorage backup
   │
Step 2: Call /api/auth/atomic-signup
   │   Body: { email, code }
   │
   ├─> ✅ RESPONSE SUCCESS
   │   ├─> Receive: { success: true, sessionToken: "XXXX" }
   │   │
   │   └─> Step 3: Sign in with NextAuth
   │       ├─> signIn('passwordless', {
   │       │     email,
   │       │     verificationCode: sessionToken,
   │       │     preVerified: 'true'
   │       │   })
   │       │
   │       ├─> ✅ SIGN-IN SUCCESS
   │       │   ├─> 💾 RESTORE CV DATA
   │       │   │   └─> preservedCVData → localStorage
   │       │   │
   │       │   └─> Redirect to callback URL
   │       │
   │       └─> ❌ SIGN-IN FAILED
   │           ├─> 💾 RESTORE CV DATA from backup
   │           │   └─> sessionStorage → localStorage
   │           │
   │           └─> Redirect to sign-in page
   │
   └─> ❌ RESPONSE FAILED
       ├─> Show error message
       └─> User can retry


┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER-SIDE FLOW                                  │
│           (/api/auth/atomic-signup/route.ts)                         │
└─────────────────────────────────────────────────────────────────────┘

Request received: { email, code }
   │
   ├─> Validate input (email, code format)
   │
   ├─> Find verification token in database
   │   WHERE: code = code
   │   AND:   email = email
   │   AND:   type = 'email-verification'
   │   AND:   expiresAt > NOW()
   │
   ├─> Check attempts & expiration
   │
   ├─> ✅ VERIFY CODE (ONE-TIME OPERATION)
   │   └─> VerificationToken.verifyCode()
   │       └─> Deletes token after verification (BURNED)
   │
   ├─> Find user by email
   │
   ├─> Mark user as verified
   │   └─> UPDATE users
   │       SET isEmailVerified = true
   │       SET emailVerifiedAt = NOW()
   │       SET lastLogin = NOW()
   │
   ├─> Create one-time session token
   │   ├─> Generate random 4-digit code
   │   └─> VerificationToken.createCode()
   │       ├─> type: 'passwordless-login'
   │       └─> expiresAt: NOW() + 5 minutes
   │
   └─> Return: { success: true, sessionToken, user }


┌─────────────────────────────────────────────────────────────────────┐
│                    NEXTAUTH FLOW                                     │
│         (src/lib/auth/unified-auth-service.ts)                       │
└─────────────────────────────────────────────────────────────────────┘

signIn('passwordless', { email, verificationCode, preVerified: 'true' })
   │
   ├─> NextAuth calls passwordless provider authorize()
   │
   ├─> Check preVerified flag
   │   └─> preVerified === 'true' ✅
   │
   ├─> SKIP CODE VERIFICATION
   │   (Code already verified by atomic-signup)
   │
   ├─> Find user by email
   │   └─> User exists ✅ (just created by atomic-signup)
   │
   ├─> Update lastLogin
   │
   ├─> Return user data
   │   └─> { id, email, name, image }
   │
   ├─> NextAuth creates session
   │   └─> Sets HTTP-only cookie
   │
   └─> Return: { ok: true }
```

---

## Email Verification Flow - BEFORE FIX (Broken)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BROKEN FLOW - DO NOT USE                          │
└─────────────────────────────────────────────────────────────────────┘

User enters code
   │
   ├─> Call /api/auth/verify-and-signin  ❌ FIRST VERIFICATION
   │   │
   │   ├─> VerificationToken.verifyCode()
   │   │   └─> Deletes token (BURNED)  ❌
   │   │
   │   └─> Returns: { success: true, requiresSignIn: true }
   │
   ├─> Call /api/auth/atomic-signup  ❌ SECOND VERIFICATION
   │   │
   │   ├─> Try to find verification token
   │   │   └─> NOT FOUND (already deleted)  ❌
   │   │
   │   └─> Returns: { success: false, message: 'Invalid or expired code' }  ❌
   │
   └─> ERROR: "Verification succeeded but sign-in failed"  ❌
       └─> User stuck in loop  ❌
```

**Problem**: Code verified and burned twice, second verification always fails.

---

## AI Analysis Flow - AFTER FIX

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER REACHES STEP 3                               │
└─────────────────────────────────────────────────────────────────────┘

Component mounts: AICareerReportStep
   │
   ├─> Wait for authentication (authStatus !== 'loading')
   │
   ├─> Check if data is initialized
   │
   ├─> 📦 RESTORE CV DATA from localStorage
   │   ├─> const savedData = localStorage.getItem('ai-career-report-data')
   │   ├─> Parse JSON
   │   ├─> dispatch({ type: 'SET_CV_DATA', payload: parsed.cvData })
   │   └─> dispatch({ type: 'SET_AI_ANALYSIS', payload: parsed.aiAnalysis })
   │
   ├─> Validate CV data has meaningful content
   │   └─> Check: work.length > 0 OR education.length > 0 OR ...
   │
   └─> ✅ TRIGGER AI ANALYSIS


┌─────────────────────────────────────────────────────────────────────┐
│                CLIENT-SIDE REQUEST PREPARATION                       │
│            (AICareerReportStep.tsx)                                  │
└─────────────────────────────────────────────────────────────────────┘

generateAIAnalysis()
   │
   ├─> Validate CV data exists
   │
   ├─> 📤 PREPARE PAYLOAD
   │   ├─> const cvDataPayload = {
   │   │     ...state.cvData,
   │   │     basics: state.cvData.basics || {},
   │   │     work: state.cvData.work || [],
   │   │     education: state.cvData.education || [],
   │   │     ... all other sections with defaults
   │   │   }
   │   │
   │   └─> Log payload size and structure
   │
   ├─> 🚀 SEND REQUEST
   │   └─> fetch('/api/ai/career-analysis', {
   │         method: 'POST',
   │         headers: { 
   │           'Content-Type': 'application/json',
   │           'Accept': 'application/json'
   │         },
   │         body: JSON.stringify({ 
   │           cvData: cvDataPayload,
   │           jobData: state.jobData || null,
   │           jobId: state.jobId || null
   │         })
   │       })
   │
   ├─> ✅ RESPONSE SUCCESS (200)
   │   ├─> Parse JSON
   │   ├─> Extract analysis from result
   │   ├─> dispatch({ type: 'SET_AI_ANALYSIS', payload: analysis })
   │   └─> Display results
   │
   └─> ❌ RESPONSE FAILED (400/500)
       ├─> Parse error response
       ├─> Show specific error message
       └─> User can retry


┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER-SIDE PROCESSING                            │
│           (/api/ai/career-analysis/route.ts)                         │
└─────────────────────────────────────────────────────────────────────┘

Request received
   │
   ├─> 📥 PARSE REQUEST BODY
   │   ├─> Try: const body = await request.json()
   │   └─> Catch: Return 400 "Invalid JSON in request body"
   │
   ├─> ✅ VALIDATE CV DATA
   │   ├─> Check: cvData exists
   │   ├─> Check: cvData is object (not null/array)
   │   ├─> Check: cvData has meaningful content
   │   │   └─> work.length > 0 OR education.length > 0 OR ...
   │   │
   │   └─> If any fail: Return 400 with specific error
   │
   ├─> Extract CV text
   │   └─> extractCVText(cvData)
   │       ├─> Combine: basics, work, education, skills, projects
   │       └─> Return: formatted text string
   │
   ├─> Check AI API keys available
   │   ├─> If NO: Use fallback analysis
   │   └─> If YES: Continue to AI
   │
   ├─> 🤖 RUN AI ANALYSES (parallel)
   │   ├─> analyzeExperienceLevel()
   │   ├─> analyzeCareerPath()
   │   ├─> analyzeStrategicSuggestions()
   │   ├─> analyzeImpactScore()
   │   ├─> analyzeCareerCoherence()
   │   ├─> analyzeCVOptimization()
   │   ├─> analyzeSkillsGap()
   │   ├─> analyzeSeniorTranslation()
   │   └─> analyzeIndustrySpecialization()
   │
   ├─> Combine all analysis results
   │
   └─> Return: { success: true, analysis: {...}, timestamp }
```

---

## Data Preservation Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA STORAGE LAYERS                               │
└─────────────────────────────────────────────────────────────────────┘

PRIMARY STORAGE (localStorage)
   └─> Key: 'ai-career-report-data'
   └─> Data: Complete CV data + AI analysis + current step
   └─> Persists across sessions
   └─> Risk: Can be cleared during authentication

BACKUP STORAGE (sessionStorage)
   └─> Key: 'ai-career-report-backup'
   └─> Data: Complete CV data (copy of primary)
   └─> Persists for current browser tab/window
   └─> Used for recovery if primary is lost

IN-MEMORY STATE (React Context)
   └─> AICareerReportContext
   └─> Data: Current working copy
   └─> Lost on page refresh
   └─> Updated from storage on mount


┌─────────────────────────────────────────────────────────────────────┐
│                    PRESERVATION FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

BEFORE Authentication:
   │
   ├─> Read from localStorage
   │   └─> preservedCVData = localStorage.getItem('ai-career-report-data')
   │
   ├─> Backup to sessionStorage
   │   └─> sessionStorage.setItem('ai-career-report-backup', preservedCVData)
   │
   └─> Keep in memory (preservedCVData variable)


DURING Authentication:
   │
   ├─> Call atomic-signup
   ├─> Call NextAuth signIn
   └─> (localStorage might be cleared here)


AFTER Successful Authentication:
   │
   ├─> Check if data still in localStorage
   │   ├─> If YES: Data survived! ✅
   │   └─> If NO: Restore from memory
   │
   ├─> Restore from memory
   │   └─> localStorage.setItem('ai-career-report-data', preservedCVData)
   │
   └─> Verify restoration
       └─> Log success ✅


AFTER Failed Authentication:
   │
   ├─> Restore from sessionStorage backup
   │   ├─> const backup = sessionStorage.getItem('ai-career-report-backup')
   │   └─> localStorage.setItem('ai-career-report-data', backup)
   │
   └─> User can retry with data intact


ON Step 3 Mount:
   │
   ├─> Try localStorage first
   │   └─> const saved = localStorage.getItem('ai-career-report-data')
   │
   ├─> If empty, try sessionStorage backup
   │   └─> const backup = sessionStorage.getItem('ai-career-report-backup')
   │
   ├─> Parse and restore to React Context
   │   └─> dispatch({ type: 'SET_CV_DATA', payload: parsed })
   │
   └─> AI Analysis can now access data ✅
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ERROR SCENARIOS                                   │
└─────────────────────────────────────────────────────────────────────┘

ERROR: Invalid Verification Code
   ├─> atomic-signup returns 400/401
   ├─> Show: "Invalid or expired code"
   ├─> remainingAttempts displayed
   └─> User can retry (max 5 attempts)

ERROR: Sign-in Timeout
   ├─> NextAuth doesn't respond in 10 seconds
   ├─> Show: "Sign-in timed out. Please try again."
   ├─> Restore CV data from backup
   └─> User can retry

ERROR: Sign-in Failed
   ├─> signIn returns { ok: false }
   ├─> Show: "Verification succeeded but sign-in failed. Redirecting..."
   ├─> Restore CV data
   └─> Redirect to sign-in page after 2 seconds

ERROR: Network Error
   ├─> fetch() throws TypeError
   ├─> Show: "Network error: Unable to connect to server..."
   ├─> Restore CV data from backup
   └─> User can retry when back online

ERROR: No CV Data in Step 3
   ├─> Check localStorage
   ├─> Check sessionStorage backup
   ├─> If both empty:
   │   └─> Show: "No CV data found. Please go back and complete your CV."
   └─> User can go back to Step 1

ERROR: AI Analysis 400 Bad Request
   ├─> Parse error response
   ├─> Check error message:
   │   ├─> "CV data" → "Invalid CV data. Please go back..."
   │   ├─> "JSON" → "Failed to process CV data. Please try again."
   │   └─> Other → Show specific error message
   └─> User can go back or retry

ERROR: AI Analysis Network/Server Error
   ├─> Use fallback analysis (minimal but valid)
   ├─> Display fallback results
   ├─> Add note: "Using fallback analysis due to service unavailability"
   └─> User can still proceed
```

---

## Success Indicators

```
✅ Verification Flow Success
   └─> Console logs:
       ├─> 🔐 Starting atomic signup for: user@example.com
       ├─> 💾 Preserved CV data: {inLocalStorage: true, inSessionStorage: true}
       ├─> ✅ User verified, got session token
       ├─> 🔐 NextAuth sign-in result: {ok: true}
       └─> ✅ Restored CV data to localStorage after sign-in

✅ Data Preservation Success
   └─> Console logs:
       ├─> 💾 Preserved CV data: {dataLength: 5432}
       ├─> 📦 Step 3: Loading saved data from localStorage: {hasCvData: true}
       ├─> 📥 Step 3: Restoring CV data from localStorage
       └─> ✅ Restored CV data to localStorage after sign-in

✅ AI Analysis Success
   └─> Console logs:
       ├─> 🚀 Starting AI analysis...
       ├─> 📊 CV Data: {hasBasics: true, workCount: 3, educationCount: 2}
       ├─> 📤 Sending payload to API: {cvDataSize: 5432}
       ├─> 📡 AI Analysis response status: 200 OK
       └─> 📥 AI Analysis result: {success: true, analysis: {...}}
```

---

## Key Differences: Before vs After

| Aspect | BEFORE (Broken) | AFTER (Fixed) |
|--------|----------------|---------------|
| Code Verification | Verified twice ❌ | Verified once ✅ |
| Code Burning | Burned before use ❌ | Burned after single use ✅ |
| CV Data Storage | localStorage only ❌ | localStorage + sessionStorage ✅ |
| Data Preservation | Lost during auth ❌ | Backed up and restored ✅ |
| AI Analysis Request | Minimal validation ❌ | Full validation + defaults ✅ |
| Error Messages | Generic ❌ | Specific and actionable ✅ |
| Logging | Minimal ❌ | Comprehensive with emojis ✅ |
| Error Recovery | Manual retry only ❌ | Automatic data restoration ✅ |

---

This visual guide should help understand the complete flow and debugging when issues occur.

