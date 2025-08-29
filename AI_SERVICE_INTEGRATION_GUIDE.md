# AI Service Integration Guide

## Overview
The AI Assistant mock data has been removed. To enable real AI functionality, you need to integrate with an AI service provider.

## Current Status
- ✅ Mock data removed from comprehensive analysis API
- ✅ Mock data removed from AI service methods
- ✅ Error handling in place for missing AI service
- ⏳ Real AI service integration needed

## AI Service Providers

### 1. OpenAI (Recommended)
**API**: https://api.openai.com/v1/chat/completions
**Models**: GPT-4, GPT-3.5-turbo
**Cost**: ~$0.03 per 1K tokens (GPT-4)

**Setup**:
```bash
# Add to your .env file
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Anthropic Claude
**API**: https://api.anthropic.com/v1/messages
**Models**: Claude-3-Opus, Claude-3-Sonnet, Claude-3-Haiku
**Cost**: ~$0.015 per 1K tokens (Claude-3-Sonnet)

**Setup**:
```bash
# Add to your .env file
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3. Google Gemini
**API**: https://generativelanguage.googleapis.com/v1beta/models
**Models**: gemini-pro, gemini-pro-vision
**Cost**: Free tier available, then ~$0.0005 per 1K tokens

**Setup**:
```bash
# Add to your .env file
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

## Integration Steps

### Step 1: Install AI Provider SDK
```bash
# For OpenAI
npm install openai

# For Anthropic
npm install @anthropic-ai/sdk

# For Google AI
npm install @google/generative-ai
```

### Step 2: Create AI Service Configuration
Create `src/lib/services/aiConfig.ts`:
```typescript
export const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'openai', // 'openai', 'anthropic', 'google'
  model: process.env.AI_MODEL || 'gpt-4',
  maxTokens: 4000,
  temperature: 0.7,
  apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_AI_API_KEY
};
```

### Step 3: Update Comprehensive Analysis API
Replace the `callAI` function in `src/app/api/ai/comprehensive-analysis/route.ts`:

```typescript
import OpenAI from 'openai';
import { AI_CONFIG } from '@/lib/services/aiConfig';

async function callAI(prompt: string) {
  try {
    const openai = new OpenAI({
      apiKey: AI_CONFIG.apiKey,
    });

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: "system",
          content: "You are an AI career assistant specializing in CV optimization and job matching."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from AI service');
    }

    return {
      success: true,
      data: response
    };

  } catch (error) {
    console.error('AI service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI service unavailable'
    };
  }
}
```

### Step 4: Update AI Service Methods
Update `src/lib/services/aiService.ts`:

```typescript
import OpenAI from 'openai';
import { AI_CONFIG } from './aiConfig';

export class AIService {
  static async calculateATSScore(cvData: CVDataStructure, jobData: Job | null): Promise<ATSAnalysis> {
    try {
      const openai = new OpenAI({
        apiKey: AI_CONFIG.apiKey,
      });

      const prompt = `Analyze this CV against the job requirements and provide an ATS score:
      
      CV Data: ${JSON.stringify(cvData)}
      Job Data: ${JSON.stringify(jobData)}
      
      Return a JSON response with:
      {
        "score": number (0-100),
        "missingKeywords": string[],
        "suggestedSkills": string[],
        "recommendations": string[]
      }`;

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: "system",
            content: "You are an ATS (Applicant Tracking System) analyzer. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from AI service');
      }

      return JSON.parse(response);

    } catch (error) {
      console.error('ATS score calculation error:', error);
      throw new Error('Failed to calculate ATS score');
    }
  }

  static async improveDescription(
    currentText: string, 
    jobData: Job | null, 
    cvData: CVDataStructure
  ): Promise<AIImprovement> {
    try {
      const openai = new OpenAI({
        apiKey: AI_CONFIG.apiKey,
      });

      const prompt = `Improve this CV description for the job:
      
      Current Text: "${currentText}"
      Job Data: ${JSON.stringify(jobData)}
      CV Data: ${JSON.stringify(cvData)}
      
      Return a JSON response with:
      {
        "improvedText": string,
        "changes": string[]
      }`;

      const completion = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: "system",
            content: "You are a CV optimization expert. Return only valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.5,
      });

      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from AI service');
      }

      return JSON.parse(response);

    } catch (error) {
      console.error('Description improvement error:', error);
      throw new Error('Failed to improve description');
    }
  }
}
```

### Step 5: Update AIAssistantService
Update `src/lib/services/aiAssistantService.ts` to use real AI calls instead of local logic.

## Environment Variables
Add to your `.env.local` file:
```bash
# AI Service Configuration
AI_PROVIDER=openai
AI_MODEL=gpt-4
OPENAI_API_KEY=your_openai_api_key_here

# Alternative providers
# ANTHROPIC_API_KEY=your_anthropic_api_key_here
# GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

## Testing
After integration:
1. Set up your AI provider API key
2. Test the comprehensive analysis API
3. Verify ATS score calculation works
4. Check that AI suggestions are generated

## Cost Considerations
- **OpenAI GPT-4**: ~$0.03 per 1K tokens
- **Anthropic Claude**: ~$0.015 per 1K tokens  
- **Google Gemini**: Free tier available

## Error Handling
The current implementation includes proper error handling:
- Graceful fallbacks when AI service is unavailable
- Clear error messages for debugging
- User-friendly error states in the UI

## Security
- API keys are stored in environment variables
- No sensitive data is logged
- Rate limiting should be implemented for production

## Next Steps
1. Choose your AI provider
2. Set up API keys
3. Implement the integration code
4. Test thoroughly
5. Monitor usage and costs
