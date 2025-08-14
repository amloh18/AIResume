# AI Assistant Mock Layouts Implementation

## Overview

The AI Assistant panel now implements an elegant, structured approach to show attractive mock layouts (skeletons/placeholders) when no job is selected, preventing empty or broken-looking cards while providing meaningful previews of each AI section's capabilities.

## Implementation Goals

✅ **Avoid blank/empty cards** when no active job is selected  
✅ **Show consistent, elegant mock layouts** that preview each section's purpose  
✅ **Automatically switch** from mock state to real suggestions when job is selected  
✅ **Keep ATS section meaningful** even without a job (baseline ATS)  
✅ **Maintain consistent heights** to prevent layout shifts  

## State Model

### AI Store Extensions
```typescript
interface AIStore {
  // Existing properties...
  
  // New mock/real data tracking
  hasRealDataBySection: Record<string, boolean>;
  loadingBySection: Record<string, boolean>;
  
  // Enhanced ATS state
  ats: {
    score?: number;
    updating: boolean;
    updatedAt?: string;
    analysis?: ATSAnalysis;
    baseline: boolean; // Whether this is baseline ATS (no job context)
  };
}
```

### Decision Logic
```typescript
// Mock/Real Decision Logic
const showSkeleton = isLoading;
const showMock = !hasJob && requiresJob;
const showRealData = hasData && (hasJob || !requiresJob);
const showEmptyState = !showSkeleton && !showMock && !showRealData;
```

## Component Architecture

### Core Components

1. **AICard** (`src/components/studio/ai/AICard.tsx`)
   - Main decision-making component
   - Handles state transitions between skeleton, mock, and real data
   - Manages action buttons and status indicators

2. **SkeletonLayout** (`src/components/studio/ai/SkeletonLayout.tsx`)
   - Animated shimmer placeholders for loading states
   - Configurable lines, chips, and buttons
   - Smooth animations with CSS keyframes

3. **MockLayouts** (`src/components/studio/ai/MockLayouts.tsx`)
   - Individual mock layouts for each AI section
   - Attractive previews with meaningful content
   - Consistent visual treatment

### Component API

```typescript
interface AICardProps {
  sectionId: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresJob?: boolean;
  isLoading?: boolean;
  hasData?: boolean;
  hasJob?: boolean;
  onGenerate?: () => void;
  children?: React.ReactNode;
  // ATS specific props
  atsScore?: number;
  atsKeywords?: string[];
  isBaseline?: boolean;
}
```

## Mock Layout Designs

### 1. ATS Score & Keywords (Baseline)
- **Real computation** based on CV data only
- Shows baseline ATS readiness score
- Displays keyword profile extracted from CV
- Info line: "Select a job to see targeted keyword gaps"

### 2. Content Optimizer (Mock)
- 2-3 placeholder suggestion rows with blurred text
- Tag chips showing "Summary", "Experience", "Skills"
- Footer: "Select a job to tailor rewrites to role requirements"

### 3. Quantification Assistant (Mock)
- Placeholder metric chips: "+20% efficiency", "$50K cost saved", "3× faster delivery"
- Greyed out appearance with opacity
- Info: "Select a job to infer relevant KPIs"

### 4. Skills & Keywords Mapper (Mock)
- Two-column layout: "Job Skills" vs "Your Skills"
- Placeholder skill bars with varying widths
- Info: "Link a job to map skills and gaps"

### 5. Gap Analyzer (Mock)
- 2 placeholder gap rows with dimmed content
- Shows structure of missing qualifications
- Info: "Select a job to identify qualification gaps"

### 6. Achievement Generator (Mock)
- STAR bullet placeholder with muted lines
- Shows structure of achievement format
- Info: "Select a job to generate STAR-format achievements"

### 7. Consistency & Compliance (Mock)
- 3 placeholder checklist items with dimmed checkboxes
- Shows "Date formats", "Verb tenses", "Bullet styles"
- Info: "Select a job to check formatting consistency"

### 8. Tailored Summary Builder (Mock)
- 2 grey summary blocks with line skeletons
- Shows structure of professional summaries
- Info: "Select a job to build tailored summaries"

### 9. Cover Letter Draft (Mock)
- Cover letter placeholder with multiple lines
- Shows structure of professional cover letters
- Info: "Select a job to generate tailored cover letter"

## Visual Treatments

### Skeleton Loader
```css
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}

.skeleton-line,
.skeleton-chip,
.skeleton-button {
  background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
  background-size: 200px 100%;
  animation: shimmer 1.5s infinite;
}
```

### Mock State Styling
- **Static muted placeholders** (no shimmer)
- **"Requires Job" badge** with yellow accent
- **Disabled Generate button** with tooltip
- **Consistent opacity** (50%) for placeholder content

### Status Indicators
- **Loading**: Spinning loader icon
- **Mock**: Alert circle + "Requires Job" badge
- **Real Data**: Refresh button
- **Empty State**: Generate button

## Interaction Patterns

### Button States
```typescript
// Mock State (no job)
<button disabled title="Select a job to generate tailored suggestions">
  <Wand2 className="h-3 w-3" />
  <span>Generate</span>
</button>

// Empty State (job selected, no data)
<button onClick={onGenerate}>
  <Wand2 className="h-3 w-3" />
  <span>Generate</span>
</button>

// Real Data State
<button onClick={onGenerate}>
  <RefreshCw className="h-3 w-3" />
  <span>Refresh</span>
</button>
```

### Tooltips and Messaging
- **Generate disabled**: "Select a job to generate tailored suggestions"
- **Mock footer**: "Select a job to [specific action]"
- **Empty state**: "Click Generate to get AI suggestions"
- **Job context**: "Select a Job in the top bar to unlock tailored suggestions"

## Data Flow

### State Transitions
1. **Initial Load** (no job)
   - ATS: Compute baseline score
   - Other sections: Show mock layouts
   - `hasRealDataBySection`: All false except ATS

2. **Job Selection**
   - Set `loadingBySection[sectionId] = true`
   - Show skeleton loaders
   - Generate suggestions in parallel
   - Set `hasRealDataBySection[sectionId] = true`

3. **Job Removal**
   - Mark job-dependent sections as `hasRealDataBySection[sectionId] = false`
   - Revert to mock layouts
   - ATS remains functional (baseline)

### Performance Optimizations
- **Debounced ATS**: 1.5s delay on CV changes
- **Concurrency Control**: 3 parallel requests max
- **Caching**: Suggestions stored in store state
- **Lazy Loading**: Mock layouts render immediately

## Accessibility Features

### Screen Reader Support
- **Status announcements**: "Loading suggestions...", "Suggestions generated"
- **Button states**: "Generate button disabled, requires job selection"
- **Content descriptions**: Meaningful alt text for mock layouts

### Keyboard Navigation
- **Logical tab order** through sections
- **Focus indicators** for interactive elements
- **Skip links** for main content areas

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .skeleton-line,
  .skeleton-chip,
  .skeleton-button {
    animation: none !important;
  }
}
```

## Testing Strategy

### Unit Tests
- **AICard component**: All state combinations
- **Mock layouts**: Proper rendering and content
- **Skeleton animations**: Loading state behavior

### Integration Tests
- **State transitions**: Job selection/removal
- **Data flow**: Mock → Skeleton → Real data
- **User interactions**: Button clicks and tooltips

### Visual Regression Tests
- **Layout consistency**: No shifts between states
- **Mock appearance**: Attractive and informative
- **Responsive behavior**: Mobile and desktop layouts

## Usage Examples

### Basic Implementation
```tsx
<AICard
  sectionId="content-optimizer"
  title="Content Optimizer"
  icon={Zap}
  requiresJob={true}
  isLoading={loadingBySection['content-optimizer']}
  hasData={hasRealDataBySection['content-optimizer']}
  hasJob={!!selectedJobId}
  onGenerate={() => generateSectionSuggestions('content-optimizer')}
>
  {/* Real suggestions content */}
</AICard>
```

### ATS Baseline Example
```tsx
<AICard
  sectionId="ats-score"
  title="ATS Score & Keywords"
  icon={Target}
  requiresJob={false}
  atsScore={ats.score}
  atsKeywords={extractCVKeywords()}
  isBaseline={ats.baseline}
>
  {/* Real ATS analysis content */}
</AICard>
```

## Benefits Achieved

### User Experience
- **No empty states**: Always meaningful content
- **Clear expectations**: Users understand what each section does
- **Smooth transitions**: Elegant loading and state changes
- **Consistent interface**: Predictable behavior across sections

### Developer Experience
- **Reusable components**: Modular architecture
- **Type safety**: Full TypeScript implementation
- **Testable code**: Clear separation of concerns
- **Maintainable**: Well-documented and structured

### Performance
- **Fast initial load**: Mock layouts render immediately
- **Efficient updates**: Only recompute when necessary
- **Optimized animations**: Hardware-accelerated CSS
- **Reduced API calls**: Smart caching and debouncing

## Future Enhancements

### Planned Features
- **Customizable mock content**: Industry-specific previews
- **Progressive enhancement**: More detailed mock layouts
- **Interactive previews**: Hover effects on mock content
- **Analytics tracking**: User interaction with mock states

### Performance Improvements
- **Virtual scrolling**: For large suggestion lists
- **Background generation**: Pre-compute suggestions
- **Smart caching**: Intelligent suggestion storage
- **Bundle optimization**: Code splitting for mock layouts

## Conclusion

The mock layouts implementation provides a polished, professional user experience that guides users toward job selection while maintaining visual appeal and functionality. The structured approach ensures consistency, accessibility, and performance while delivering clear value propositions for each AI section.
