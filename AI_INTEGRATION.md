# AI Integration with Gemini API

This document describes the AI integration features in the Circle CV app using Google's Gemini API.

## Features

### 1. AI-Powered Content Generation
- **Professional Summary Generation**: Create compelling professional summaries based on role and experience
- **Achievement Statements**: Generate quantifiable achievement statements for work experience
- **Skills Descriptions**: Write detailed skill descriptions with appropriate proficiency levels
- **Cover Letter Generation**: Create personalized cover letters for specific job applications

### 2. Content Optimization
- **ATS Optimization**: Optimize CV content for Applicant Tracking Systems with relevant keywords
- **Impact Enhancement**: Make achievements more impactful with quantifiable metrics
- **Tone Improvement**: Improve overall tone and professionalism of content

### 3. AI Suggestions
- **Real-time Suggestions**: Get AI-powered suggestions for content improvements
- **Section-specific Recommendations**: Receive targeted suggestions for different CV sections
- **Impact Assessment**: AI evaluates the potential impact of suggested changes

## API Security

### Environment Configuration
The Gemini API key is stored securely in environment variables:

```bash
# .env.local
GEMINI_API_KEY=your-gemini-api-key-here
```

### Security Measures
1. **API Key Protection**: API key is never exposed to the client-side
2. **Rate Limiting**: Basic rate limiting implementation (can be enhanced with Redis)
3. **Input Validation**: All user inputs are validated before processing
4. **Error Handling**: Comprehensive error handling without exposing sensitive information
5. **Safety Settings**: Content filtering to prevent harmful content generation

## API Endpoints

### POST /api/ai/gemini
Main endpoint for AI operations.

**Request Body:**
```typescript
{
  prompt: string;
  context?: string;
  type: 'rewrite' | 'optimize' | 'suggest' | 'generate';
  section?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  content?: string;
  error?: string;
  details?: string;
  type?: string;
  section?: string;
}
```

## Usage Examples

### 1. Content Rewriting
```typescript
import { AIService } from '@/lib/ai-service';

const response = await AIService.rewriteContent(
  "I managed a team and increased sales",
  "experience"
);
```

### 2. ATS Optimization
```typescript
const response = await AIService.optimizeContent(
  "Product Manager with 5 years experience",
  "profile"
);
```

### 3. Content Generation
```typescript
const response = await AIService.generateProfessionalSummary(
  "Product Manager",
  "5+ years"
);
```

## AI Service Class

The `AIService` class provides a clean interface for all AI operations:

### Methods
- `generateContent(request: AIRequest)`: Generic content generation
- `rewriteContent(content: string, section?: string)`: Rewrite existing content
- `optimizeContent(content: string, section?: string)`: Optimize for ATS
- `suggestImprovements(content: string, section?: string)`: Get improvement suggestions
- `generateNewContent(prompt: string, context?: string)`: Generate new content

### CV-Specific Helpers
- `generateProfessionalSummary(role: string, experience: string)`
- `generateAchievements(role: string, company: string, responsibilities: string[])`
- `optimizeForATS(content: string, jobTitle: string, keywords: string[])`
- `generateSkillsDescription(skill: string, level: string)`
- `generateCoverLetter(jobTitle: string, company: string, experience: string)`

## Error Handling

The AI integration includes comprehensive error handling:

1. **Network Errors**: Handles connection issues gracefully
2. **API Errors**: Processes Gemini API errors without exposing sensitive data
3. **Validation Errors**: Validates inputs before processing
4. **Rate Limiting**: Basic rate limiting to prevent abuse

## Performance Considerations

1. **Caching**: Consider implementing caching for frequently requested content
2. **Async Processing**: All AI operations are asynchronous
3. **Loading States**: UI shows loading states during AI processing
4. **Error Recovery**: Graceful error recovery with user-friendly messages

## Future Enhancements

1. **Advanced Rate Limiting**: Implement Redis-based rate limiting
2. **Content Caching**: Cache generated content to reduce API calls
3. **Batch Processing**: Process multiple sections simultaneously
4. **Custom Prompts**: Allow users to create custom AI prompts
5. **AI Model Selection**: Support for different AI models
6. **Content History**: Track AI-generated content history

## Setup Instructions

1. **Get Gemini API Key**: Obtain API key from Google AI Studio
2. **Environment Setup**: Add API key to `.env.local`
3. **Install Dependencies**: Ensure all dependencies are installed
4. **Test Integration**: Test AI functionality in development

## Security Best Practices

1. **Never expose API keys in client-side code**
2. **Implement proper rate limiting in production**
3. **Validate all user inputs**
4. **Monitor API usage and costs**
5. **Regular security audits**
6. **Keep dependencies updated**

## Troubleshooting

### Common Issues
1. **API Key Invalid**: Check environment variable configuration
2. **Rate Limit Exceeded**: Implement proper rate limiting
3. **Network Errors**: Check internet connection and API endpoint
4. **Content Filtering**: Ensure content doesn't violate safety settings

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed error messages. 