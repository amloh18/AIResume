# AI Assistant Panel Implementation

## Overview

The AI Assistant Panel in the CV Studio provides intelligent suggestions and analysis to help users optimize their CVs for specific job applications. The implementation follows strict behavioral rules for automatic generation, state management, and user interaction.

## Behavioral Rules

### 1. Initial Suggestions Auto-Generation

**Trigger Conditions:**
- When a Job Reference is selected (active jobId present)
- On first load of the Studio when a jobId is already linked to the CV
- Immediately after a user selects or changes the Job Reference
- After a successful Upload CV parse that materially updates CVdata (debounced)

**Sections Included in Auto-Generate:**
- Content Optimizer
- Quantification Assistant
- Skills & Keywords Mapper
- Gap Analyzer
- Achievement Generator
- Tailored Summary Builder
- Cover Letter Draft (only when mode=cover)

**Sections Excluded from Auto-Generate:**
- Consistency & Compliance (manual Generate to avoid heavy global edits on load)

**UI States:**
- Shows "Generating suggestions…" banner with spinner
- Displays per-section skeletons during generation
- Banner hides on completion
- Sections display suggestion cards with "Use" actions ready

### 2. ATS Score and Keywords Always-On

**Always Compute:**
- ATS Score and Keywords based on current CVdata, even without job selection
- With active job: Uses job description and required skills for ATS match score
- Without active job: Computes baseline ATS compliance score based on best practices

**Refresh Policy:**
- Recompute on any CVdata change (debounced 1.5 seconds)
- Recompute when jobId changes
- Show "Updated just now" timestamps
- Show "Updating…" during recomputation

### 3. Data Flow and Triggers

**Job Selection Handler:**
- PATCH /api/cv/:id { jobId }
- Fire parallel Generate calls for job-dependent sections
- Recompute ATS Score & Keywords with job context

**CVdata Change (Autosave or Local Update):**
- Debounced (1.5s) recompute of ATS Score & Keywords
- For job-dependent sections: Mark suggestions as "Out of date" with refresh chip
- Provide "Refresh with latest CV" button per section
- Offer global "Refresh all job-based suggestions" button

**Upload CV Parse Accepted:**
- Recompute ATS Score & Keywords immediately
- Queue "Refresh all job-based suggestions" toast if job is active

## Architecture

### Core Components

1. **AI Store** (`src/lib/stores/aiStore.ts`)
   - Manages AI assistant state
   - Tracks ATS score, section suggestions, loading states
   - Handles out-of-date suggestions

2. **AI Assistant Service** (`src/lib/services/aiAssistantService.ts`)
   - Core AI operations using Gemini API
   - Handles all AI section generation
   - Manages API calls and response parsing

3. **AI Assistant Hook** (`src/lib/hooks/useAIAssistant.ts`)
   - Custom hook for AI operations
   - Manages debounced ATS calculations
   - Handles initial suggestions generation

4. **AI Assistant Panel** (`src/components/studio/AIAssistantPanel.tsx`)
   - Main UI component
   - Implements behavioral rules
   - Manages user interactions

5. **Suggestion Applier** (`src/lib/utils/aiSuggestionApplier.ts`)
   - Applies AI suggestions to CV data
   - Handles different suggestion types
   - Validates suggestion applicability

### API Endpoints

All AI endpoints follow the pattern `/api/ai/{section}`:

- `POST /api/ai/ats-score` - Calculate ATS score and analysis
- `POST /api/ai/optimize` - Content optimization suggestions
- `POST /api/ai/quantify` - Quantification suggestions
- `POST /api/ai/skills-map` - Skills mapping suggestions
- `POST /api/ai/gap-analyze` - Gap analysis suggestions
- `POST /api/ai/achievements` - Achievement generation
- `POST /api/ai/summary` - Tailored summary generation
- `POST /api/ai/consistency` - Consistency checking
- `POST /api/ai/cover-letter` - Cover letter drafting

### State Management

**AI Store State:**
```typescript
{
  ats: {
    score?: number;
    updating: boolean;
    updatedAt?: string;
    analysis?: ATSAnalysis;
  };
  sections: Record<string, AISectionState>;
  generatingInitial: boolean;
  lastGeneratedAt?: string;
  outOfDate: Record<string, boolean>;
}
```

**Section State:**
```typescript
{
  isLoading: boolean;
  suggestions: AISuggestion[];
  lastGeneratedAt?: string;
  error?: string;
}
```

## Usage

### Basic Setup

1. **Import the hook:**
```typescript
import { useAIAssistant } from '@/lib/hooks/useAIAssistant';

const { ats, sections, generateInitialSuggestions } = useAIAssistant(cvId, documentType);
```

2. **Use in component:**
```typescript
const AIAssistantPanel = ({ cvId, documentType, ...props }) => {
  const aiAssistant = useAIAssistant(cvId, documentType);
  
  // Auto-generate when job is selected
  useEffect(() => {
    if (selectedJobId && jobData) {
      aiAssistant.generateInitialSuggestions();
    }
  }, [selectedJobId, jobData]);
  
  return (
    // Render AI panel with aiAssistant state
  );
};
```

### Applying Suggestions

```typescript
import { AISuggestionApplier } from '@/lib/utils/aiSuggestionApplier';

const handleUseSuggestion = (suggestion: AISuggestion) => {
  const result = AISuggestionApplier.applySuggestion(suggestion, cvData, onUpdateField);
  if (result.success) {
    console.log('Suggestion applied:', result.message);
  } else {
    console.error('Failed to apply:', result.message);
  }
};
```

## Performance Optimizations

### Debouncing
- ATS calculations are debounced to 1.5 seconds
- Prevents excessive API calls during rapid CV edits

### Concurrency Control
- Initial suggestions generation uses concurrency limit of 3
- Prevents API saturation with parallel requests

### Caching
- Suggestions are cached in store state
- Out-of-date markers prevent stale data usage
- Manual refresh available for updated suggestions

### Error Handling
- Graceful degradation when AI services are unavailable
- Per-section error states
- Retry mechanisms for failed operations

## Accessibility

### Screen Reader Support
- Announce job selection: "Job selected. Generating tailored suggestions."
- ATS updates: aria-live polite updates for score and keyword lists
- Keyboard navigation for suggestion lists

### Focus Management
- Clear focus indicators for interactive elements
- Logical tab order through AI sections
- Skip links for main content areas

## Testing

### Unit Tests
- AI service methods are fully tested
- Mock API responses for consistent testing
- Edge case handling verification

### Integration Tests
- End-to-end AI workflow testing
- State management integration
- User interaction flows

## Configuration

### Environment Variables
```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_public_key
```

### API Configuration
- Temperature: 0.3 (balanced creativity and consistency)
- Max tokens: 2048 (sufficient for detailed suggestions)
- Top-p: 0.8, Top-k: 40 (controlled randomness)

## Future Enhancements

### Planned Features
- Suggestion history and versioning
- Bulk suggestion application
- Custom AI prompts for specific industries
- Integration with job application tracking
- Advanced ATS scoring algorithms

### Performance Improvements
- Server-side suggestion caching
- Background suggestion generation
- Progressive loading of AI features
- Optimized API response handling

## Troubleshooting

### Common Issues

1. **AI suggestions not generating:**
   - Check Gemini API key configuration
   - Verify CV data is properly loaded
   - Ensure job selection is active for job-dependent sections

2. **ATS score not updating:**
   - Check debounce timing (1.5 seconds)
   - Verify CV data changes are triggering updates
   - Check API response format

3. **Suggestions marked as out-of-date:**
   - This is expected behavior when CV data changes
   - Use "Refresh" button to regenerate with latest data
   - Check if job context has changed

### Debug Mode
Enable debug logging by setting:
```typescript
localStorage.setItem('ai-debug', 'true');
```

This will log all AI operations and state changes to the console.

## Contributing

When adding new AI features:

1. Follow the existing pattern for API endpoints
2. Add proper TypeScript types
3. Include comprehensive tests
4. Update documentation
5. Consider performance implications
6. Ensure accessibility compliance

## License

This implementation is part of the Circle CV application and follows the project's licensing terms.
