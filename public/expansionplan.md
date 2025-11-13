# CV Match Analysis Expansion Plan

## Overview
This document outlines the implementation plan for CV Match Analysis feature that compares a user's master CV (with AI career report `metadata.aiAnalysis`) against job descriptions fetched by the Chrome extension.

The master CV is stored in the `cvdata` collection with:
- `metadata.isMaster: true` to identify the master CV
- `metadata.aiAnalysis` containing the AI-generated career analysis
- `cvData` containing the structured CV data (basics, work, education, skills, projects, etc.)

## Architecture

### Data Structure
- **Master CV**: Stored in `cvdata` collection with `metadata.isMaster: true`
- **AI Career Report**: Stored as `metadata.aiAnalysis` object within the `cvdata` document
- **CV Data**: Stored in `cvData` object containing `basics`, `work`, `education`, `skills`, `projects`, etc.
- **Job Description**: Extracted from job posting pages (LinkedIn, Indeed, etc.)

### Flow
1. Extension extracts job description from webpage
2. Extension calls backend API with job description
3. Backend fetches user's master CV with `metadata.aiAnalysis` and `cvData`
4. Backend extracts skills from `cvData.skills` (array of categories with skills)
5. Backend uses AI (Gemini) to compare `metadata.aiAnalysis` + `cvData` against job description
6. Backend returns structured match results
7. Extension displays match score and recommendations

---

## Backend Implementation (Circle_CV_app)

### 1. Update Master CV Report Endpoint

**File**: `src/app/api/users/[userId]/master-cv-report/route.ts` (or similar)

**Changes Required**:
- Query `cvdata` collection with filter: `{ userId: ObjectId, 'metadata.isMaster': true }`
- Access `metadata.aiAnalysis` for AI career analysis
- Access `cvData` for structured CV data
- Extract skills from `cvData.skills` array (which has categories)
- Return structured CV report with both `aiAnalysis` and `cvData`

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb'; // Adjust import path
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session || session.user?.id !== params.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    const db = await connectToDatabase();
    
    // Find master CV with metadata.aiAnalysis
    const cvdata = await db.collection('cvdata').findOne({
      userId: new ObjectId(params.userId),
      'metadata.isMaster': true
    });

    if (!cvdata || !cvdata.metadata?.aiAnalysis) {
      return NextResponse.json(
        { error: 'Master CV or AI analysis not found' },
        { status: 404 }
      );
    }

    // Extract skills from cvData.skills array (which has categories)
    const allSkills: string[] = [];
    if (cvdata.cvData?.skills && Array.isArray(cvdata.cvData.skills)) {
      cvdata.cvData.skills.forEach((skillCategory: any) => {
        if (skillCategory.skills && Array.isArray(skillCategory.skills)) {
          allSkills.push(...skillCategory.skills);
        }
      });
    }

    // Calculate experience years from work history
    const workHistory = cvdata.cvData?.work || [];
    let totalYears = 0;
    if (workHistory.length > 0) {
      // Calculate total years from all work experiences
      // Dates are in format "YYYY-MM" (e.g., "2022-11")
      workHistory.forEach((job: any) => {
        if (job.startDate) {
          const start = new Date(job.startDate + '-01'); // Add day for proper parsing
          const end = job.endDate && job.endDate !== 'Present' 
            ? new Date(job.endDate + '-01')
            : new Date();
          const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
          totalYears += Math.max(0, years);
        }
      });
      totalYears = Math.round(totalYears * 10) / 10; // Round to 1 decimal place
    }

    // Get experience level from aiAnalysis
    const experienceLevel = cvdata.metadata.aiAnalysis.experienceLevel?.level || 'mid';

    // Return structured CV report with metadata.aiAnalysis
    return NextResponse.json({
      userId: cvdata.userId.toString(),
      skills: allSkills,
      experience: {
        years: totalYears || (cvdata.metadata.aiAnalysis.experienceLevel ? 5 : 0), // Fallback to 5 if not calculated
        level: experienceLevel.toLowerCase() as 'entry' | 'mid' | 'senior' | 'executive',
        industries: [] // Extract from work history if needed
      },
      education: cvdata.cvData?.education?.[0] ? {
        degree: cvdata.cvData.education[0].studyType,
        field: cvdata.cvData.education[0].area,
        institution: cvdata.cvData.education[0].institution
      } : undefined,
      certifications: cvdata.cvData?.certificates?.map((cert: any) => cert.name) || [],
      // Include full aiAnalysis for advanced matching
      aiAnalysis: cvdata.metadata.aiAnalysis,
      // Include cvData for comprehensive matching
      cvData: cvdata.cvData
    });
  } catch (error) {
    console.error('Error fetching master CV report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Create CV Match Analysis Endpoint

**New File**: `src/app/api/jobs/analyze-cv-match/route.ts`

**Purpose**: 
- Fetches user's master CV with `metadata.aiAnalysis` and `cvData`
- Extracts skills from `cvData.skills` array structure
- Uses AI (Gemini) to compare against job description
- Returns structured match results

**Implementation**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobDescription, jobTitle, company } = body;

    if (!jobDescription) {
      return NextResponse.json(
        { error: 'Job description is required' },
        { status: 400 }
      );
    }

    // Fetch master CV with metadata.aiAnalysis
    const db = await connectToDatabase();
    const { ObjectId } = require('mongodb'); // or import { ObjectId } from 'mongodb' at top
    
    const cvdata = await db.collection('cvdata').findOne({
      userId: new ObjectId(session.user.id),
      'metadata.isMaster': true
    });

    if (!cvdata || !cvdata.metadata?.aiAnalysis) {
      return NextResponse.json(
        { error: 'Master CV or AI analysis not found. Please create a master CV on cvcircle.io' },
        { status: 404 }
      );
    }

    // Use AI to analyze match
    const matchResult = await analyzeCVMatchWithAI(
      cvdata.metadata.aiAnalysis,
      cvdata.cvData,
      jobDescription,
      jobTitle,
      company
    );

    return NextResponse.json(matchResult);
  } catch (error) {
    console.error('Error analyzing CV match:', error);
    return NextResponse.json(
      { error: 'Failed to analyze CV match' },
      { status: 500 }
    );
  }
}

async function analyzeCVMatchWithAI(
  aiAnalysis: any,
  cvData: any,
  jobDescription: string,
  jobTitle?: string,
  company?: string
) {
  // Initialize Gemini AI
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  // Extract skills from cvData.skills array (which has categories)
  const allSkills: string[] = [];
  if (cvData?.skills && Array.isArray(cvData.skills)) {
    cvData.skills.forEach((skillCategory: any) => {
      if (skillCategory.skills && Array.isArray(skillCategory.skills)) {
        allSkills.push(...skillCategory.skills);
      }
    });
  }

  // Get experience level from aiAnalysis
  const experienceLevel = aiAnalysis.experienceLevel?.level || 'mid';

  // Calculate experience years from work history
  // Dates are in format "YYYY-MM" (e.g., "2022-11")
  let experienceYears = 0;
  if (cvData?.work && Array.isArray(cvData.work) && cvData.work.length > 0) {
    cvData.work.forEach((job: any) => {
      if (job.startDate) {
        const start = new Date(job.startDate + '-01'); // Add day for proper parsing
        const end = job.endDate && job.endDate !== 'Present' 
          ? new Date(job.endDate + '-01')
          : new Date();
        const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        experienceYears += Math.max(0, years);
      }
    });
    experienceYears = Math.round(experienceYears * 10) / 10; // Round to 1 decimal place
  }

  // Prepare CV data for AI comparison
  const cvProfile = {
    skills: allSkills,
    experience: {
      years: experienceYears,
      level: experienceLevel.toLowerCase(),
      workHistory: cvData?.work || []
    },
    education: cvData?.education || [],
    certifications: cvData?.certificates?.map((cert: any) => cert.name) || [],
    summary: cvData?.basics?.summary || '',
    projects: cvData?.projects || [],
    // Include AI analysis insights
    aiAnalysis: {
      experienceLevel: aiAnalysis.experienceLevel,
      careerPath: aiAnalysis.careerPath,
      impactScore: aiAnalysis.impactScore,
      industrySpecialization: aiAnalysis.industrySpecialization
    }
  };

  // Create AI prompt for comparison
  const prompt = `You are a career matching expert. Compare this CV profile against the job description and provide a detailed match analysis.

CV PROFILE:
${JSON.stringify(cvProfile, null, 2)}

JOB DETAILS:
Title: ${jobTitle || 'Not specified'}
Company: ${company || 'Not specified'}
Description:
${jobDescription}

Provide a comprehensive JSON response with the following structure:
{
  "matchScore": <number 0-100>,
  "isTopApplicant": <boolean - true if matchScore >= 80>,
  "matchedSkills": <array of skills that match>,
  "missingSkills": <array of required skills not in CV>,
  "experienceMatch": <boolean>,
  "educationMatch": <boolean>,
  "summary": <brief text summary of the match>,
  "skillMatchScore": <number 0-100 - percentage of required skills matched>,
  "experienceMatchScore": <number 0-100>,
  "educationMatchScore": <number 0-100>,
  "skillGapAnalysis": {
    "critical": <array of must-have skills missing>,
    "important": <array of nice-to-have skills missing>,
    "recommendations": <array of improvement suggestions>
  },
  "cvRecommendations": <array of specific CV improvement tips>
}

Be thorough and accurate. Consider:
- Skill relevance and depth
- Experience level alignment
- Education requirements
- Industry fit
- Soft skills mentioned in job description
- Quantifiable achievements`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from AI response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    const matchResult = JSON.parse(jsonMatch[0]);

    // Validate and structure the response
    return {
      matchScore: Math.min(100, Math.max(0, matchResult.matchScore || 0)),
      isTopApplicant: (matchResult.matchScore || 0) >= 80,
      matchedSkills: matchResult.matchedSkills || [],
      missingSkills: matchResult.missingSkills || [],
      experienceMatch: matchResult.experienceMatch || false,
      educationMatch: matchResult.educationMatch || false,
      summary: matchResult.summary || 'Match analysis completed',
      skillMatchScore: matchResult.skillMatchScore,
      experienceMatchScore: matchResult.experienceMatchScore,
      educationMatchScore: matchResult.educationMatchScore,
      skillGapAnalysis: matchResult.skillGapAnalysis || {
        critical: [],
        important: [],
        recommendations: []
      },
      cvRecommendations: matchResult.cvRecommendations || []
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    // Fallback to basic keyword matching if AI fails
    return fallbackKeywordMatching(cvProfile, jobDescription);
  }
}

// Fallback function if AI fails
function fallbackKeywordMatching(cvProfile: any, jobDescription: string) {
  const jobLower = jobDescription.toLowerCase();
  const cvSkills = (cvProfile.skills || []).map((s: string) => s.toLowerCase());
  
  // Extract skills from job description (basic keyword matching)
  const commonSkills = [
    'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java',
    'node.js', 'express', 'django', 'aws', 'docker', 'kubernetes', 'sql',
    'mongodb', 'postgresql', 'git', 'agile', 'scrum', 'ci/cd', 'devops'
  ];
  
  const jobSkills = commonSkills.filter(skill => jobLower.includes(skill));
  const matchedSkills = jobSkills.filter(skill => 
    cvSkills.some(cvSkill => cvSkill.includes(skill) || skill.includes(cvSkill))
  );
  const missingSkills = jobSkills.filter(skill => !matchedSkills.includes(skill));
  
  const skillMatchScore = jobSkills.length > 0 
    ? (matchedSkills.length / jobSkills.length) * 100 
    : 0;
  
  return {
    matchScore: Math.round(skillMatchScore * 0.7), // Weighted score
    isTopApplicant: skillMatchScore >= 80,
    matchedSkills,
    missingSkills,
    experienceMatch: true, // Assume match for fallback
    educationMatch: true,
    summary: `Matched ${matchedSkills.length} of ${jobSkills.length} required skills`,
    skillMatchScore: Math.round(skillMatchScore),
    experienceMatchScore: 50,
    educationMatchScore: 50,
    skillGapAnalysis: {
      critical: [],
      important: missingSkills,
      recommendations: missingSkills.map(skill => `Consider learning ${skill}`)
    },
    cvRecommendations: []
  };
}
```

### 3. Environment Variables

Add to `.env` or `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Install Dependencies

```bash
npm install @google/generative-ai
```

---

## Extension Implementation (CVCircle_extension)

### 1. Update API Client

**File**: `src/services/api.ts`

Add new method:
```typescript
/**
 * Analyze CV match using AI (compares master CV metadata.aiAnalysis with job description)
 */
async analyzeCVMatch(
  jobDescription: string,
  jobTitle?: string,
  company?: string
): Promise<ApiResponse<CVMatchResult>> {
  return this.requestWithRetry<CVMatchResult>('/jobs/analyze-cv-match', {
    method: 'POST',
    body: JSON.stringify({
      jobDescription,
      jobTitle,
      company
    })
  });
}
```

### 2. Update CV Match Service

**File**: `src/services/cvMatch.ts`

Replace `analyzeMatch` method to use backend AI:
```typescript
async analyzeMatch(job: Job, isPremium: boolean = false): Promise<CVMatchResult | null> {
  try {
    const user = await authService.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Use backend AI service to compare master CV metadata.aiAnalysis with job
    const response = await apiClient.analyzeCVMatch(
      job.jobDescription || '',
      job.jobTitle,
      job.company
    );

    if (!response.success || !response.data) {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('Error analyzing CV match:', error);
    return null;
  }
}
```

### 3. Remove Old Matching Logic

The old keyword-based matching methods in `cvMatch.ts` can be removed:
- `extractSkills()`
- `extractRequirements()`
- `findMatchedSkills()`
- `findMissingSkills()`
- `checkExperienceMatch()`
- `checkEducationMatch()`
- `generateSummary()`
- `analyzeSkillGaps()`
- `generateCVRecommendations()`

These are now handled by the backend AI service.

---

## Database Query Structure

### Master CV Query
```javascript
const { ObjectId } = require('mongodb');

db.cvdata.findOne({
  userId: new ObjectId(userId),
  'metadata.isMaster': true
})
```

### Accessing Data Structure
```javascript
const cvdata = await db.collection('cvdata').findOne({...});

// CV Data Structure
const cvData = cvdata.cvData;
// - cvData.basics (name, email, phone, summary, etc.)
// - cvData.work (array of work experiences)
// - cvData.education (array of education entries)
// - cvData.skills (array of skill categories with skills array)
// - cvData.projects (array of projects)
// - cvData.certificates (array of certificates)

// AI Analysis Structure
const aiAnalysis = cvdata.metadata.aiAnalysis;
// - aiAnalysis.experienceLevel.level (e.g., "Senior")
// - aiAnalysis.experienceLevel.rationale
// - aiAnalysis.careerPath (step1, step2, step3)
// - aiAnalysis.strategicSuggestions
// - aiAnalysis.impactScore
// - aiAnalysis.careerCoherence
// - aiAnalysis.cvOptimization
// - aiAnalysis.industrySpecialization

// Skills Extraction (from cvData.skills)
const allSkills = [];
cvData.skills.forEach(skillCategory => {
  if (skillCategory.skills) {
    allSkills.push(...skillCategory.skills);
  }
});
```

---

## API Response Structure

### Request
```
POST /api/jobs/analyze-cv-match
Content-Type: application/json

{
  "jobDescription": "Full job description text...",
  "jobTitle": "Senior Product Designer",
  "company": "Innovate Inc."
}
```

### Response
```json
{
  "matchScore": 85,
  "isTopApplicant": true,
  "matchedSkills": ["React", "TypeScript", "Node.js"],
  "missingSkills": ["GraphQL", "Docker"],
  "experienceMatch": true,
  "educationMatch": true,
  "summary": "Strong match with 8/10 required skills...",
  "skillMatchScore": 80,
  "experienceMatchScore": 100,
  "educationMatchScore": 100,
  "skillGapAnalysis": {
    "critical": [],
    "important": ["GraphQL"],
    "recommendations": ["Consider learning GraphQL to improve match"]
  },
  "cvRecommendations": [
    "Highlight your React experience more prominently",
    "Add Docker to your skills section"
  ]
}
```

---

## Testing Checklist

### Backend
- [ ] Master CV endpoint returns `metadata.aiAnalysis` and `cvData`
- [ ] CV match endpoint authenticates users correctly
- [ ] CV match endpoint handles missing master CV gracefully
- [ ] AI analysis returns valid JSON structure
- [ ] Fallback matching works when AI fails
- [ ] Error handling for API failures

### Extension
- [ ] CV match analysis triggers on job fetch
- [ ] Match score displays correctly
- [ ] Top Applicant badge shows for scores >= 80%
- [ ] Premium features display for premium users
- [ ] Error messages show when CV report not found
- [ ] Loading states work correctly

---

## Security Considerations

1. **Authentication**: All endpoints verify user session
2. **Authorization**: Users can only access their own CV data
3. **API Keys**: Gemini API key stored server-side only
4. **Rate Limiting**: Consider implementing rate limits for AI calls
5. **Error Handling**: Don't expose sensitive data in error messages

---

## Performance Optimization

1. **Caching**: Consider caching CV match results for same job descriptions
2. **Async Processing**: For heavy analysis, consider queue-based processing
3. **Response Time**: Target < 3 seconds for AI analysis
4. **Fallback**: Always have keyword matching as fallback

---

## Future Enhancements

1. **Batch Analysis**: Analyze multiple jobs at once
2. **Match History**: Store match results for comparison
3. **Custom Thresholds**: Allow users to set custom match thresholds
4. **Industry-Specific Matching**: Specialized matching for different industries
5. **Real-time Updates**: Update match score as user updates CV

---

## Implementation Order

1. ✅ Update master CV report endpoint to return `metadata.aiAnalysis` and `cvData`
2. ✅ Create CV match analysis endpoint using correct schema
3. ✅ Update extension API client
4. ✅ Update extension CV match service
5. ✅ Test end-to-end flow
6. ✅ Deploy backend changes
7. ✅ Deploy extension update

## Schema Notes

### Database Structure
- **Collection Name**: `cvdata` (lowercase)
- **Master CV Filter**: `{ userId: ObjectId, 'metadata.isMaster': true }`
- **Document Variable**: `cvdata` (lowercase - the retrieved document)

### Field Names (camelCase)
- **AI Analysis Location**: `cvdata.metadata.aiAnalysis` (not `iAnalysis`)
- **CV Data Location**: `cvdata.cvData` (camelCase)
- **Skills Structure**: `cvData.skills` is an array of objects: `{ category: string, skills: string[] }`
- **Work History**: `cvData.work` is an array of work experiences with `startDate` and `endDate` (format: "YYYY-MM")
- **Education**: `cvData.education` is an array with `studyType`, `area`, `institution`
- **Projects**: `cvData.projects` is an array of project objects
- **Certificates**: `cvData.certificates` is an array with `name` field
- **Basics**: `cvData.basics` contains `summary`, `name`, `email`, `phone`, etc.

---

## Notes

- **ObjectId Conversion**: `userId` in the database is stored as MongoDB ObjectId, so use `new ObjectId(userId)` when querying
- **Skills Extraction**: `cvData.skills` is an array of objects with structure: `{ category: string, skills: string[] }`
- **Experience Calculation**: Calculate years from `cvData.work` array using `startDate` and `endDate` fields
- **AI Analysis Structure**: `metadata.aiAnalysis` contains comprehensive career analysis including experience level, career path, impact score, etc.
- **Gemini API**: Has rate limits - implement retry logic if needed
- **Streaming Responses**: Consider using streaming responses for better UX during analysis
- **Cost Monitoring**: Monitor AI API costs and usage
- **Date Format**: Work dates are in format "YYYY-MM" (e.g., "2022-11")

