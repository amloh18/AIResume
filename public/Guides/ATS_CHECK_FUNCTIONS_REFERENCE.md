# ATS Check Functions Reference

## 🔍 **Available ATS Check Functions**

### **1. JourneyTimelineCard ATS Check**
**Location**: `src/components/dashboard/JourneyTimelineCard.tsx`
**Function**: `handleATSCheck()`
**Line**: 587-651
**Usage**: Journey card step 3 ATS calculation

```typescript
const handleATSCheck = async () => {
  if (!journey.cvId) return;
  
  setIsRunningATSCheck(true);
  try {
    console.log('🔍 JourneyTimelineCard - Running ATS check for CV:', journey.cvId, 'Job:', journey.jobId);
    
    const response = await fetch('/api/ai/ats-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cvId: journey.cvId,
        jobId: journey.jobId
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const score = result.data.score || result.data.atsScore;
        if (score !== undefined) {
          updateAtsScore(score);
          
          // Show success toast
          if (score >= 80) {
            toast.success(`ATS score calculated: ${score}% - Great match!`);
          } else {
            toast.info(`ATS score calculated: ${score}% - Consider optimizing for better match`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ JourneyTimelineCard - Error running ATS check:', error);
    toast.error('Network error during ATS calculation. Please check your connection.');
  } finally {
    setIsRunningATSCheck(false);
  }
};
```

**Button Click Handler**: Line 1146
```typescript
onClick={handleATSCheck}
```

### **2. Studio ATS Score Analyzer**
**Location**: `src/components/studio/ATSScoreAnalyzer.tsx`
**Function**: `calculateATSScore()`
**Line**: 113-190
**Usage**: Studio ATS analysis

```typescript
const calculateATSScore = async () => {
  setIsLoading(true);
  try {
    const cvText = getCVText();
    const jobDescription = jobData.description || jobData.jobDescription || jobData.requirements || jobData.jobRequirements || '';

    if (!cvText) {
      throw new Error('CV text is required for ATS analysis');
    }

    const response = await fetch('/api/ats/calculate-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cvText,
        jobDescription: finalJobDescription,
        cvData
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to calculate ATS score');
    }

    const result: ATSResult = await response.json();
    setAtsResult(result);
  } catch (error) {
    console.error('🔍 ATS Analyzer - Error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Button Click Handler**: Line 321
```typescript
onClick={calculateATSScore}
```

### **3. Comprehensive ATS Analyzer**
**Location**: `src/components/studio/ComprehensiveATSAnalyzer.tsx`
**Function**: `calculateComprehensiveATSScore()`
**Line**: 165-266
**Usage**: Comprehensive ATS analysis with detailed breakdown

```typescript
const calculateComprehensiveATSScore = useCallback(async () => {
  if (!cvData || !jobData) {
    console.log('🔍 Comprehensive ATS Analyzer - Missing data:', { hasCvData: !!cvData, hasJobData: !!jobData });
    return;
  }
  
  setIsLoading(true);
  try {
    const cvText = getCVText();
    const jobDescription = jobData.description || jobData.jobDescription || jobData.requirements || jobData.jobRequirements || '';
    
    if (!cvText) {
      throw new Error('CV text is required for ATS analysis');
    }
    
    const response = await fetch('/api/ats/comprehensive-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cvText,
        jobDescription: finalJobDescription,
        cvData,
        jobData,
        cvId,
        comprehensive: true
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to calculate comprehensive ATS score');
    }
    
    const result: ATSResult = await response.json();
    setAtsResult(result);
  } catch (error) {
    console.error('🔍 Comprehensive ATS Analyzer - Error:', error);
  } finally {
    setIsLoading(false);
  }
}, [cvData, jobData, getCVText, cvId]);
```

**Button Click Handler**: Line 389
```typescript
onClick={calculateComprehensiveATSScore}
```

### **4. Enhanced Studio Layout ATS**
**Location**: `src/components/studio/EnhancedStudioLayout.tsx`
**Function**: `calculateATSScore()`
**Line**: 184-196
**Usage**: Auto ATS calculation in studio

```typescript
const calculateATSScore = async () => {
  if (!cvData || !jobData) return;
  
  setIsCalculatingATS(true);
  try {
    const analysis = await AIAssistantService.calculateATSScore(cvData, jobData);
    setAtsScore(analysis.score);
  } catch (error) {
    console.error('Error calculating ATS score:', error);
  } finally {
    setIsCalculatingATS(false);
  }
};
```

**Trigger**: Auto-triggered on CV/job data changes (Line 178-182)

### **5. Payment Integration Example ATS**
**Location**: `src/components/payment/PaymentIntegrationExample.tsx`
**Function**: `handleATSCheck()`
**Line**: 230
**Usage**: Payment integration testing

```typescript
<button
  onClick={handleATSCheck}
  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
    canRunATSCheck().canPerform
      ? 'bg-purple-500 text-white hover:bg-purple-600'
      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
  }`}
  disabled={!canRunATSCheck().canPerform}
>
  {canRunATSCheck().canPerform ? (
    <>
      <CheckCircle className="w-4 h-4 inline mr-2" />
      Run Check
    </>
  ) : (
    <>
      <AlertCircle className="w-4 h-4 inline mr-2" />
      Limit Reached
    </>
  )}
</button>
```

## 🔗 **API Endpoints Used**

### **1. `/api/ai/ats-score`**
- **Used by**: JourneyTimelineCard.handleATSCheck()
- **Purpose**: AI-powered ATS analysis
- **Input**: `{ cvId, jobId }`
- **Output**: `{ success: boolean, data: ATSAnalysis }`

### **2. `/api/ats/calculate-score`**
- **Used by**: ATSScoreAnalyzer.calculateATSScore()
- **Purpose**: Basic ATS calculation
- **Input**: `{ cvText, jobDescription, cvData }`
- **Output**: `{ score: number, breakdown: {...}, details: {...} }`

### **3. `/api/ats/comprehensive-analysis`**
- **Used by**: ComprehensiveATSAnalyzer.calculateComprehensiveATSScore()
- **Purpose**: Detailed ATS analysis
- **Input**: `{ cvText, jobDescription, cvData, jobData, cvId, comprehensive: true }`
- **Output**: Comprehensive ATS analysis with detailed breakdown

## 🎯 **Function Linking Strategy**

### **Journey Card Integration**
The `handleATSCheck` function in `JourneyTimelineCard.tsx` should be linked to:

1. **Button Click**: Line 1146 - `onClick={handleATSCheck}`
2. **API Endpoint**: `/api/ai/ats-score` (Line 594)
3. **Error Handling**: Lines 640-650
4. **Success Feedback**: Lines 630-634

### **Studio Integration**
The studio components have their own ATS functions:

1. **ATSScoreAnalyzer**: Basic ATS analysis
2. **ComprehensiveATSAnalyzer**: Detailed analysis
3. **EnhancedStudioLayout**: Auto-calculation

## 🚀 **Usage Recommendations**

### **For Journey Cards**
- Use `handleATSCheck()` for step 3 ATS calculation
- Provides user feedback with toast notifications
- Handles errors gracefully
- Updates journey with ATS score

### **For Studio**
- Use `calculateATSScore()` for basic analysis
- Use `calculateComprehensiveATSScore()` for detailed analysis
- Auto-triggered in EnhancedStudioLayout

### **For Payment Integration**
- Use `handleATSCheck()` for testing payment limits
- Includes usage limit checking
- Shows upgrade prompts when limits reached

## 📝 **Implementation Notes**

1. **Error Handling**: All functions include comprehensive error handling
2. **User Feedback**: Toast notifications for success/error states
3. **Loading States**: Proper loading state management
4. **API Integration**: Uses appropriate endpoints for different use cases
5. **Data Validation**: Checks for required data before processing

The ATS check functions are properly integrated and should work correctly with the journey card step 3 functionality.
