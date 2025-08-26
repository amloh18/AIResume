# CV Data Management Specification

## 📋 Table of Contents
1. [Overview](#overview)
2. [Data Flow Architecture](#data-flow-architecture)
3. [Database Schema](#database-schema)
4. [API Routes](#api-routes)
5. [Data Transformation](#data-transformation)
6. [Studio Implementation](#studio-implementation)
7. [Template System](#template-system)
8. [Saving Mechanism](#saving-mechanism)
9. [Preview Rendering](#preview-rendering)
10. [Technical Implementation](#technical-implementation)

---

## 🎯 Overview

The CV Circle application manages CV data through a sophisticated system that handles:
- **Data Entry**: User input through onboarding forms and studio panels
- **Data Storage**: MongoDB with structured schemas
- **Data Transformation**: Conversion between different formats
- **Template Rendering**: Dynamic preview generation
- **Real-time Saving**: Auto-save functionality with debouncing

### Key Data Formats:
1. **CVDataStructure** (JSON Resume format) - Primary data format
2. **DatabaseCVData** - Optimized for storage
3. **Template Data** - Styling and layout information

---

## 🔄 Data Flow Architecture

### 1. User Input Flow
```
User Input → Form Components → CVDataStructure → Database → Preview
```

### 2. Data Loading Flow
```
Database → CVDataStructure → Studio Components → Preview Panel
```

### 3. Template Application Flow
```
Template Selection → Style Application → Preview Rendering → Save
```

---

## 🗄️ Database Schema

### Primary CV Collection Schema

```typescript
// src/models/CV.ts
interface ICV extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  cvData: CVDataStructure;  // Main CV content
  templateId?: mongoose.Types.ObjectId;
  templateName?: string;
  templateData?: {
    display: {
      layout: 'single-column' | 'two-column' | 'absolute';
      padding: string;
      fontFamily: string;
      sectionSpacing: string;
    };
    sections: Array<{
      id: string;
      type: 'header' | 'section';
      title: string;
      content: object;
      entries: object[];
      details: string[];
      styleSnippetId: string;
    }>;
    snippetStyles: Array<{
      id: string;
      category: string;
      style: object;
    }>;
  };
  status: 'draft' | 'published' | 'archived';
  version: number;
  styling: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: string;
    spacing: number;
    customCSS?: string;
  };
  metadata: {
    lastModified: Date;
    createdFrom?: mongoose.Types.ObjectId;
    tags: string[];
    isPublic: boolean;
    viewCount: number;
    downloadCount: number;
    type: 'cv' | 'cover_letter';
    starred: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### CVDataStructure (JSON Resume Format)

```typescript
// src/types/cv.ts
interface CVDataStructure {
  basics: {
    name: string;
    label: string;
    image: string;
    email: string;
    phone: string;
    url: string;
    summary: string;
    location: {
      address: string;
      postalCode: string;
      city: string;
      countryCode: string;
      region: string;
    };
    profiles: Array<{
      network: string;
      username: string;
      url: string;
    }>;
  };
  work: Array<{
    name: string;
    position: string;
    url: string;
    startDate: string;
    endDate: string;
    summary: string;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    url: string;
    area: string;
    studyType: string;
    startDate: string;
    endDate: string;
    score: string;
    courses: string[];
  }>;
  skills: Array<{
    name: string;
    level: string;
    keywords: string[];
  }>;
  projects: Array<{
    name: string;
    startDate: string;
    endDate: string;
    description: string;
    highlights: string[];
    url: string;
  }>;
  certificates: Array<{
    name: string;
    date: string;
    issuer: string;
    url: string;
  }>;
  languages: Array<{
    language: string;
    fluency: string;
  }>;
  // ... other sections
}
```

---

## 🌐 API Routes

### CV Management Routes

#### 1. Create CV
```typescript
POST /api/cvs
Body: {
  userId: string;
  title: string;
  cvData: CVDataStructure;
  jobId?: string;
  templateId?: string;
  type: 'cv' | 'cover_letter';
}
```

#### 2. Get CV
```typescript
GET /api/cvs/{id}?userId={userId}
Response: {
  success: boolean;
  data: {
    cv: ICV;
  };
}
```

#### 3. Update CV
```typescript
PUT /api/cvs/{id}
Body: {
  userId: string;
  cvData?: CVDataStructure;
  template?: object;
  title?: string;
  styling?: object;
}
```

#### 4. Save CV (Auto-save)
```typescript
POST /api/cvs/{id}/save
Body: {
  userId: string;
  cvData: CVDataStructure;
  template?: object;
  title?: string;
  status?: 'draft' | 'published' | 'archived';
}
```

#### 5. Delete CV
```typescript
DELETE /api/cvs/{id}?userId={userId}
```

### Template Routes

#### 1. Get Templates
```typescript
GET /api/templates
Response: {
  success: boolean;
  data: {
    templates: Template[];
  };
}
```

#### 2. Update Template
```typescript
PUT /api/templates/{id}
Body: {
  name: string;
  description: string;
  category: string;
  styling: object;
  sections: object[];
}
```

---

## 🔄 Data Transformation

### Transformation Utilities

#### 1. Database to Studio Format
```typescript
// src/lib/utils/cvDataTransform.ts
export const transformDatabaseToStudio = (dbData: DatabaseCVData): CVDataStructure => {
  return {
    basics: {
      name: dbData.basics.name,
      label: '',
      image: '',
      email: dbData.basics.email,
      phone: dbData.basics.phone,
      url: dbData.basics.url,
      summary: dbData.basics.summary,
      location: {
        address: dbData.basics.location.address,
        postalCode: '',
        city: dbData.basics.location.city,
        countryCode: '',
        region: ''
      },
      profiles: dbData.basics.profiles.map(profile => ({
        network: profile.network,
        username: '',
        url: profile.url
      }))
    },
    work: dbData.work.map(work => ({
      name: work.name,
      position: work.position,
      url: '',
      startDate: work.startDate,
      endDate: work.endDate,
      summary: work.summary,
      highlights: work.highlights
    })),
    // ... other sections
  };
};
```

#### 2. Studio to Database Format
```typescript
export const transformStudioToDatabase = (studioData: CVDataStructure): DatabaseCVData => {
  return {
    basics: {
      name: studioData.basics.name || '',
      email: studioData.basics.email || '',
      phone: studioData.basics.phone || '',
      url: studioData.basics.url || '',
      summary: studioData.basics.summary || '',
      location: {
        address: studioData.basics.location.address || '',
        city: studioData.basics.location.city || ''
      },
      profiles: studioData.basics.profiles?.map(profile => ({
        network: profile.network,
        url: profile.url
      })) || []
    },
    // ... other sections
  };
};
```

---

## 🎨 Studio Implementation

### CV Studio Component Structure

```typescript
// src/components/studio/CVStudio.tsx
const CVStudio: React.FC<CVStudioProps> = ({ jobId, cvId, userId }) => {
  // State Management
  const [cvData, setCvData] = useState<CVDataStructure | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  
  // Data Update Functions
  const updateCVField = useCallback((path: string, value: any) => {
    setCvData(prev => {
      if (!prev) return prev;
      const pathArray = path.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < pathArray.length - 1; i++) {
        current = current[pathArray[i]];
      }
      
      current[pathArray[pathArray.length - 1]] = value;
      return newData;
    });
  }, []);

  // Auto-save with debouncing
  const debouncedSave = useCallback(
    debounce(async (data: CVDataStructure) => {
      try {
        setSaveStatus('saving');
        if (cvId) {
          await CVService.updateCV(cvId, data, userId);
        } else {
          const newCV = await CVService.createCV({
            userId,
            title: 'Untitled CV',
            ...data,
            jobId: selectedJobId || jobId
          });
          router.replace(`/studio?cvId=${newCV.data?.cv?.id}`);
        }
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('error');
      }
    }, 1000),
    [cvId, jobId, selectedJobId, router, userId]
  );

  // Auto-save on data changes
  useEffect(() => {
    if (cvData && !isLoading) {
      debouncedSave(cvData);
    }
  }, [cvData, debouncedSave, isLoading]);
};
```

### Form Panel Integration

```typescript
// src/components/studio/OnboardingFormPanel.tsx
const OnboardingFormPanel: React.FC<OnboardingFormPanelProps> = ({
  cvData,
  onUpdateField,
  onAddSection,
  onRemoveSection,
  isCollapsed,
  onTogglePanel
}) => {
  // Mock context for onboarding form compatibility
  const createMockOnboardingContext = () => ({
    state: { cvData: cvData || defaultCVData },
    dispatch: (action: any) => {
      if (action.type === 'UPDATE_CV_DATA') {
        Object.entries(action.payload).forEach(([section, value]) => {
          if (section === 'basics') {
            Object.entries(value as any).forEach(([field, fieldValue]) => {
              if (field === 'location') {
                Object.entries(fieldValue as any).forEach(([locField, locValue]) => {
                  onUpdateField(`basics.location.${locField}`, locValue);
                });
              } else {
                onUpdateField(`basics.${field}`, fieldValue);
              }
            });
          } else {
            onUpdateField(section, value);
          }
        });
      }
    }
  });
};
```

---

## 🎨 Template System

### Template Configuration

```typescript
// Template structure
interface Template {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'creative' | 'minimal' | 'modern' | 'classic';
  thumbnail: string;
  isActive: boolean;
  isPremium: boolean;
  styling: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: string;
    spacing: number;
  };
  sections: Array<{
    id: string;
    type: 'header' | 'section';
    title: string;
    required: boolean;
    order: number;
  }>;
  metadata: {
    version: string;
    author: string;
    tags: string[];
    usageCount: number;
  };
}
```

### Template Application Process

1. **Template Selection**: User chooses template from gallery
2. **Style Application**: Template styles are applied to CV data
3. **Section Mapping**: CV sections are mapped to template sections
4. **Preview Rendering**: CV is rendered with template styling
5. **Save**: Template configuration is saved with CV data

---

## 💾 Saving Mechanism

### Auto-save Implementation

```typescript
// Debounced auto-save function
const debouncedSave = useCallback(
  debounce(async (data: CVDataStructure) => {
    try {
      setSaveStatus('saving');
      
      if (cvId) {
        // Update existing CV
        await CVService.updateCV(cvId, data, userId);
      } else {
        // Create new CV
        const newCV = await CVService.createCV({
          userId,
          title: 'Untitled CV',
          ...data,
          jobId: selectedJobId || jobId
        });
        
        // Update URL with new CV ID
        const newCvId = newCV.data?.cv?.id || newCV.id;
        router.replace(`/studio?cvId=${newCvId}${selectedJobId || jobId ? `&jobId=${selectedJobId || jobId}` : ''}`);
      }
      
      setSaveStatus('saved');
    } catch (err) {
      console.error('Error saving CV:', err);
      setSaveStatus('error');
    }
  }, 1000), // 1 second debounce
  [cvId, jobId, selectedJobId, router, userId]
);

// Trigger auto-save on data changes
useEffect(() => {
  if (cvData && !isLoading) {
    debouncedSave(cvData);
  }
}, [cvData, debouncedSave, isLoading]);
```

### Save Status Indicators

```typescript
// Save status display
const renderSaveStatus = () => {
  switch (saveStatus) {
    case 'saving':
      return (
        <div className="flex items-center gap-2 text-yellow-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Saving...</span>
        </div>
      );
    case 'saved':
      return (
        <div className="flex items-center gap-2 text-green-600">
          <Check className="w-4 h-4" />
          <span>Saved</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>Save failed</span>
        </div>
      );
  }
};
```

---

## 👁️ Preview Rendering

### Preview Panel Implementation

```typescript
// src/components/studio/PreviewPanel.tsx
const PreviewPanel: React.FC<PreviewPanelProps> = ({
  cvData,
  template,
  jobData,
  zoom,
  setZoom,
  paperSize,
  setPaperSize,
  documentType,
  sectionOrder
}) => {
  // Paper dimensions
  const paperDimensions = {
    A4: { width: 794, height: 1123 }, // 8.27" x 11.69"
    Letter: { width: 816, height: 1056 } // 8.5" x 11"
  };

  const currentDimensions = paperDimensions[paperSize];

  // Render CV preview
  const renderCVPreview = () => {
    return (
      <div 
        className="relative"
        style={{
          width: currentDimensions.width * zoom,
          minHeight: currentDimensions.height * zoom,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center'
        }}
      >
        <div className="bg-white mx-auto shadow-lg">
          <CVPreviewContent 
            cvData={cvData} 
            theme="light"
            showBadge={false}
            sectionOrder={sectionOrder}
          />
        </div>
      </div>
    );
  };
};
```

### CV Preview Content

```typescript
// src/components/studio/CVPreviewContent.tsx
const CVPreviewContent: React.FC<CVPreviewContentProps> = ({ 
  cvData, 
  theme = 'light',
  showBadge = true,
  sectionOrder = ['basics', 'experience', 'education', 'skills', 'projects', 'certificates', 'languages']
}) => {
  // Render sections in order
  const renderSections = () => {
    return sectionOrder.map(sectionKey => {
      switch (sectionKey) {
        case 'basics':
          return renderHeader();
        case 'experience':
          return cvData?.work?.length > 0 && renderExperience();
        case 'education':
          return cvData?.education?.length > 0 && renderEducation();
        case 'skills':
          return cvData?.skills?.length > 0 && renderSkills();
        case 'projects':
          return cvData?.projects?.length > 0 && renderProjects();
        case 'certificates':
          return cvData?.certificates?.length > 0 && renderCertificates();
        case 'languages':
          return cvData?.languages?.length > 0 && renderLanguages();
        default:
          return null;
      }
    }).filter(Boolean);
  };

  return (
    <div className="space-y-8 relative">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl" 
           style={{ width: '210mm', minHeight: '297mm' }}>
        <div className="p-8">
          {renderSections()}
        </div>
      </div>
    </div>
  );
};
```

---

## 🔧 Technical Implementation

### Service Layer

#### CV Service
```typescript
// src/lib/services/cvService.ts
export class CVService {
  static async getCV(cvId: string, userId?: string): Promise<{ cvData: CVDataStructure; jobId?: string }> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    const response = await fetch(`/api/cvs/${cvId}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch CV');
    }
    
    const data = await response.json();
    
    // Transform database format to studio format
    const cvData = data.data?.cv?.cvData || data.cv?.cvData;
    if (cvData) {
      // Check if already in CVDataStructure format
      if (cvData.basics && cvData.basics.name) {
        return { cvData, jobId: data.data?.cv?.jobId };
      } else {
        // Transform from database format
        const transformedData = transformDatabaseToStudio(cvData);
        return { cvData: transformedData, jobId: data.data?.cv?.jobId };
      }
    }
    
    return { cvData: defaultCVData, jobId: data.data?.cv?.jobId };
  }

  static async createCV(cvData: CVDataStructure & { 
    jobId?: string; 
    userId: string;
    title: string;
  }): Promise<any> {
    // Transform Studio format to database format
    const dbData = transformStudioToDatabase(cvData);
    
    const response = await fetch('/api/cvs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...cvData,
        cvData: dbData
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create CV');
    }
    
    return await response.json();
  }

  static async updateCV(cvId: string, cvData: CVDataStructure, userId?: string): Promise<any> {
    // Transform Studio format to database format
    const dbData = transformStudioToDatabase(cvData);
    
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId);
    }
    
    const response = await fetch(`/api/cvs/${cvId}?${params.toString()}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cvData: dbData
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update CV');
    }
    
    return await response.json();
  }
}
```

### Data Adapters

#### Legacy Data Support
```typescript
// src/lib/utils/dataAdapter.ts
export const isOldCVData = (data: any): boolean => {
  return data && (
    data.personalInfo ||
    data.sections?.personalInfo ||
    data.firstName ||
    data.lastName
  );
};

export const toCVDataStructure = (oldData: any): CVDataStructure => {
  if (isOldCVData(oldData)) {
    return {
      basics: {
        name: oldData.personalInfo?.firstName + ' ' + oldData.personalInfo?.lastName || 
              oldData.firstName + ' ' + oldData.lastName || '',
        label: oldData.personalInfo?.title || oldData.title || '',
        image: '',
        email: oldData.personalInfo?.email || oldData.email || '',
        phone: oldData.personalInfo?.phone || oldData.phone || '',
        url: oldData.personalInfo?.website || oldData.website || '',
        summary: oldData.personalInfo?.summary || oldData.summary || '',
        location: {
          address: oldData.personalInfo?.location || oldData.location || '',
          postalCode: '',
          city: '',
          countryCode: '',
          region: ''
        },
        profiles: []
      },
      work: oldData.experience?.map(exp => ({
        name: exp.company || '',
        position: exp.position || exp.jobTitle || '',
        url: '',
        startDate: exp.startDate || '',
        endDate: exp.endDate || '',
        summary: exp.description || '',
        highlights: exp.achievements || []
      })) || [],
      // ... other sections
    };
  }
  
  return oldData;
};
```

---

## 📊 Data Flow Summary

### 1. Customer Data Entry
```
User Input → Form Validation → CVDataStructure → Auto-save → Database
```

### 2. CV Studio Data Interpretation
```
Database → CVDataStructure → Studio Components → Real-time Preview
```

### 3. Template Application
```
Template Selection → Style Application → Preview Rendering → Save
```

### 4. Data Persistence
```
Studio Changes → Debounced Save → API → Database → Success/Error Feedback
```

### 5. Preview Generation
```
CVDataStructure + Template → Preview Panel → CVPreviewContent → Rendered CV
```

---

## 🔗 Key File Links

### Core Files:
- **Data Models**: `src/models/CV.ts`
- **Type Definitions**: `src/types/cv.ts`
- **Studio Component**: `src/components/studio/CVStudio.tsx`
- **Preview Panel**: `src/components/studio/PreviewPanel.tsx`
- **Preview Content**: `src/components/studio/CVPreviewContent.tsx`
- **Form Panel**: `src/components/studio/OnboardingFormPanel.tsx`

### API Routes:
- **CV CRUD**: `src/app/api/cvs/route.ts`
- **CV Operations**: `src/app/api/cvs/[id]/route.ts`
- **CV Save**: `src/app/api/cvs/[id]/save/route.ts`
- **Templates**: `src/app/api/templates/route.ts`

### Services & Utils:
- **CV Service**: `src/lib/services/cvService.ts`
- **Data Transform**: `src/lib/utils/cvDataTransform.ts`
- **Data Adapter**: `src/lib/utils/dataAdapter.ts`
- **CV Creation**: `src/lib/utils/cvCreationUtils.ts`

### Documentation:
- **Database Setup**: `public/Guides/DATABASE_SETUP.md`
- **MongoDB Schema**: `public/Guides/MONGODB_SCHEMA_SETUP.md`
- **API Documentation**: `public/Guides/API_DOCUMENTATION.md`
- **Layout Engine**: `public/Guides/LAYOUT_ENGINE_README.md`

---

This specification provides a comprehensive overview of how data flows through the CV Circle application, from user input to database storage and preview rendering. The system is designed to be flexible, scalable, and maintainable while providing a smooth user experience.
