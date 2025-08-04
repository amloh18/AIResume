# Layout Engine Implementation

## Overview

This document describes the implementation of the new Layout Engine for the CV Editor, based on the logic specified in `public/canva.txt`. The new system provides a modular, template-driven approach to CV rendering with support for dynamic layouts, snippets, and AI integration.

## Architecture

### Core Components

1. **Template Registry** (`/components/templates/TemplateRegistry.ts`)
   - Defines available CV templates
   - Specifies layout configurations, fonts, and section positioning
   - Supports single-column, two-column, and responsive layouts

2. **Snippet Registry** (`/components/snippets/SnippetRegistry.ts`)
   - Modular section components with different rendering styles
   - Compatible with specific templates
   - Supports various formats (chips, bars, dots, etc.)

3. **Layout Engine** (`/components/layout/LayoutEngine.tsx`)
   - Main rendering component
   - Handles template selection and column layout
   - Manages section positioning and data flow

4. **Section Renderer** (`/components/layout/SectionRenderer.tsx`)
   - Renders individual CV sections
   - Supports different section types (profile, experience, skills, etc.)
   - Handles inline editing and data updates

5. **Editable Field** (`/components/layout/EditableField.tsx`)
   - Reusable component for inline text editing
   - Supports single-line and multi-line editing
   - Preview mode support

## Template System

### Template Configuration

Each template defines:
- **Layout**: Number of columns and width ratios
- **Fonts**: Heading and body font families with size specifications
- **Sections**: Position mapping for different CV sections
- **Styling**: Default colors, spacing, and visual elements

### Available Templates

1. **Modern Professional** (2-column, 65/35 split)
   - Profile and experience on left
   - Skills and languages on right
   - Professional fonts and spacing

2. **Minimalist ATS** (1-column)
   - ATS-friendly single column layout
   - Clean, simple formatting
   - Optimized for applicant tracking systems

3. **Creative Graphical** (2-column, 60/40 split)
   - Visual elements and progress bars
   - Creative fonts and styling
   - Background colors and graphical elements

4. **Compact Textual** (1-column)
   - Space-efficient layout
   - Inline skills and compact formatting
   - Ideal for content-heavy CVs

5. **Two Column Classic** (2-column, 70/30 split)
   - Traditional two-column layout
   - Wide left column for main content
   - Narrow right column for skills and languages

6. **Modern Minimal** (1-column)
   - Clean, modern single column
   - Arrow-style bullet points
   - Minimalist design approach

## Snippet System

### Snippet Types

1. **Experience Snippets**
   - `experienceBulletDash`: Dash-style bullet points
   - `experienceBulletDot`: Traditional dot bullets
   - `experienceBulletArrow`: Modern arrow bullets

2. **Skills Snippets**
   - `skillsChip`: Colored chip format
   - `skillsBar`: Progress bar format
   - `skillsCategorized`: Category-based organization
   - `skillsInline`: Inline comma-separated format

3. **Profile Snippets**
   - `profileCentered`: Centered alignment
   - `profileLeftAligned`: Left alignment

4. **Education Snippets**
   - `educationSimple`: Clean, simple format
   - `educationDetailed`: Detailed with bullet points

5. **Language Snippets**
   - `languagesDot`: Colored dot indicators
   - `languagesCompact`: Compact format

6. **Project Snippets**
   - `projectsGrid`: Grid layout
   - `projectsList`: Simple list format

### Snippet Configuration

Each snippet includes:
- **Section**: Which CV section it applies to
- **Render Config**: Styling and formatting options
- **Compatible Templates**: Which templates support this snippet
- **Usage Statistics**: Popularity and usage count

## Data Structure

### New CV Data Format

```typescript
interface CVData {
  sections: {
    profile: ProfileData;
    experience: ExperienceData;
    education: EducationData;
    skills: SkillsData;
    languages: LanguageData;
    projects: ProjectData;
  };
  sectionSnippets: {
    [sectionKey: string]: string; // Snippet ID
  };
}
```

### Section Data Formats

1. **Profile Data**
   ```typescript
   {
     name: string;
     contact0: string;
     contact1: string;
     contact2: string;
     summary: string;
   }
   ```

2. **Experience/Education Data**
   ```typescript
   {
     entries: Array<{
       title?: string;
       degree?: string;
       company?: string;
       institution?: string;
       duration: string;
       details: string[];
     }>;
   }
   ```

3. **Skills Data**
   ```typescript
   {
     entries: Array<{
       title: string;
       details: string[];
     }>;
   }
   ```

## Features

### Layout Management
- **Dynamic Column Layouts**: Support for 1-2 column layouts with configurable ratios
- **Responsive Design**: Templates can be responsive or fixed-width
- **Section Positioning**: Flexible positioning (left, right, top, middle, bottom)

### Inline Editing
- **Click-to-Edit**: Click any text field to edit inline
- **Multi-line Support**: Support for both single-line and multi-line editing
- **Preview Mode**: Toggle between edit and preview modes
- **Auto-save**: Automatic saving with debounced updates

### Template Switching
- **Seamless Transitions**: Switch between templates without data loss
- **Format Conversion**: Automatic conversion between old and new data formats
- **Snippet Compatibility**: Automatic snippet assignment based on template

### AI Integration
- **Section-Specific AI**: AI features work with the new section structure
- **Template-Aware Suggestions**: AI suggestions consider template layout
- **Snippet Optimization**: AI can suggest optimal snippets for content

## Migration from Old System

### Data Conversion

The system includes automatic conversion from the old CV data format:

```typescript
// Old format
{
  personal_info: { name: "...", contact0: "...", ... },
  experience: { experience_0_title: "...", experience_0_company: "...", ... },
  education: { education_0_degree: "...", education_0_institution: "...", ... }
}

// New format
{
  sections: {
    profile: { name: "...", contact0: "...", ... },
    experience: { entries: [{ title: "...", company: "...", ... }] },
    education: { entries: [{ degree: "...", institution: "...", ... }] }
  },
  sectionSnippets: {
    profile: "profileCentered",
    experience: "experienceBulletDash",
    education: "educationSimple"
  }
}
```

### Backward Compatibility

- **Automatic Detection**: System detects old format and converts automatically
- **Data Preservation**: All data is preserved during conversion
- **Fallback Support**: Graceful fallback to default snippets if conversion fails

## Usage

### Basic Usage

```typescript
import { LayoutEngine } from '@/components/layout/LayoutEngine';

<LayoutEngine
  cvData={cvData}
  templateId="modernProfessional"
  zoom={1}
  isPreviewMode={false}
  onDataChange={handleDataChange}
/>
```

### Template Selection

```typescript
import { getTemplate, getAllTemplates } from '@/components/templates/TemplateRegistry';

const template = getTemplate('modernProfessional');
const allTemplates = getAllTemplates();
```

### Snippet Management

```typescript
import { getSnippetsBySection, getSnippetsByTemplate } from '@/components/snippets/SnippetRegistry';

const experienceSnippets = getSnippetsBySection('experience');
const compatibleSnippets = getSnippetsByTemplate('modernProfessional');
```

## Testing

### Test Page

A comprehensive test page is available at `/test-layout-engine` that includes:
- Template switching
- Zoom controls
- Preview mode toggle
- Sample CV data
- Snippet registry display

### Features Tested

1. **Template Rendering**: All templates render correctly
2. **Data Editing**: Inline editing works for all field types
3. **Layout Switching**: Seamless transitions between layouts
4. **Snippet Compatibility**: Snippets work with compatible templates
5. **Data Persistence**: Changes are saved correctly

## Performance

### Optimizations

1. **Memoized Components**: React.memo for performance-critical components
2. **Debounced Saves**: Auto-save with 1-second debounce
3. **Lazy Loading**: Templates and snippets loaded on demand
4. **Efficient Re-renders**: Minimal re-renders during editing

### Memory Management

1. **Cleanup**: Proper cleanup of event listeners and timers
2. **State Management**: Efficient state updates without unnecessary re-renders
3. **Data Structure**: Optimized data structure for fast access

## Future Enhancements

### Planned Features

1. **Advanced Templates**: More complex layouts with custom positioning
2. **Dynamic Snippets**: User-created custom snippets
3. **Template Builder**: Visual template creation tool
4. **Export Formats**: Additional export formats (Word, LaTeX)
5. **Collaboration**: Real-time collaborative editing

### Performance Improvements

1. **Virtual Scrolling**: For large CVs with many sections
2. **Caching**: Template and snippet caching
3. **Web Workers**: Background processing for heavy operations
4. **Progressive Loading**: Load templates progressively

## Conclusion

The new Layout Engine provides a robust, flexible foundation for CV editing with:
- **Modular Design**: Easy to extend and customize
- **Template System**: Professional, consistent layouts
- **Snippet System**: Reusable, styled components
- **AI Integration**: Seamless AI feature integration
- **Performance**: Optimized for smooth user experience

The system maintains backward compatibility while providing a modern, scalable architecture for future enhancements. 