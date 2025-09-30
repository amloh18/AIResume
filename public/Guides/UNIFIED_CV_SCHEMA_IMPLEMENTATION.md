# Unified CV Data Structure Implementation

## 🎯 Overview

This document outlines the implementation of a **unified CV data structure** across all application modules. This eliminates data transformation inconsistencies and establishes a single source of truth for all CV-related operations.

## 📋 Key Principles

1. **Single Source of Truth**: All CV data uses the same schema across all modules
2. **No Transformation Layers**: Direct serialization/deserialization only
3. **Schema Consistency**: Database, API, and UI all use the same structure
4. **Version Control**: Schema changes are tracked and documented
5. **Validation**: All data must pass unified schema validation

## 🏗️ Architecture

### Core Schema Files

```
src/types/unified-cv-schema.ts          # Main schema definitions
src/lib/services/unified-cv-service.ts  # Unified service layer
src/models/CV.ts                        # Updated database model
```

### Schema Components

1. **UnifiedCVDataStructure**: Core CV content structure
2. **UnifiedCVDocument**: Complete CV document with metadata
3. **UnifiedCVAPIResponse**: Standardized API response format
4. **UnifiedCVRequest**: Standardized API request format
5. **Validation Schema**: JSON Schema for runtime validation

## 📊 Data Flow

### Before (Multiple Transformations)
```
User Input → Form → CVDataStructure → DatabaseCVData → Database
Database → DatabaseCVData → CVDataStructure → Studio → Preview
```

### After (Unified Schema)
```
User Input → Form → UnifiedCVDataStructure → Database
Database → UnifiedCVDataStructure → Studio → Preview
```

## 🔧 Implementation Details

### 1. Schema Definition

```typescript
// src/types/unified-cv-schema.ts
export interface UnifiedCVDataStructure {
  basics: {
    name: string;
    email: string;
    // ... all personal info fields
  };
  work: Array<{
    name: string;
    position: string;
    // ... all work experience fields
  }>;
  // ... all other sections
}
```

### 2. Database Model

```typescript
// src/models/CV.ts
export interface ICV extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  cvData: UnifiedCVDataStructure; // Using unified schema
  templateId: mongoose.Types.ObjectId;
  status: 'draft' | 'published' | 'archived';
  version: number;
  metadata: {
    isMaster: boolean;
    // ... all metadata fields
  };
}
```

### 3. API Service

```typescript
// src/lib/services/unified-cv-service.ts
export class UnifiedCVService {
  static async getCV(cvId: string, userId?: string): Promise<UnifiedCVDocument>
  static async createCV(cvData: UnifiedCVRequest, userId: string): Promise<UnifiedCVDocument>
  static async updateCV(cvId: string, cvData: Partial<UnifiedCVRequest>): Promise<UnifiedCVDocument>
  // ... all CRUD operations
}
```

## 🚀 Migration Strategy

### Phase 1: Schema Definition ✅
- [x] Create unified schema types
- [x] Define validation schema
- [x] Create migration utilities

### Phase 2: Database Updates ✅
- [x] Update CV model to use unified schema
- [x] Add missing fields (status, version, starred)
- [x] Update indexes for new fields

### Phase 3: API Updates 🔄
- [x] Update CV API endpoints to use unified schema
- [x] Create unified CV service
- [x] Remove transformation layers

### Phase 4: Component Updates 🔄
- [x] Update CVStudio to use unified schema
- [x] Update preview components
- [x] Update form components

### Phase 5: Parser Updates ⏳
- [ ] Update CV parser to output unified schema
- [ ] Update AI analysis to use unified schema
- [ ] Update import/export functionality

### Phase 6: Cleanup ⏳
- [ ] Remove old transformation utilities
- [ ] Remove legacy CVService
- [ ] Update all remaining components

## 📝 Usage Examples

### Creating a New CV

```typescript
import { UnifiedCVService, DEFAULT_UNIFIED_CV_DATA } from '@/lib/services/unified-cv-service';

// Create with default data
const newCV = await UnifiedCVService.createDefaultCV(
  'My CV',
  userId,
  templateId
);

// Create with custom data
const customCV = await UnifiedCVService.createCV({
  title: 'Software Engineer CV',
  cvData: {
    ...DEFAULT_UNIFIED_CV_DATA,
    basics: {
      ...DEFAULT_UNIFIED_CV_DATA.basics,
      name: 'John Doe',
      email: 'john@example.com'
    }
  },
  templateId,
  status: 'draft'
}, userId);
```

### Loading CV Data

```typescript
// Get single CV
const cv = await UnifiedCVService.getCV(cvId, userId);

// Get all CVs with filters
const cvs = await UnifiedCVService.getCVs(userId, {
  status: 'published',
  isMaster: false,
  starred: true
});

// Get master CV
const masterCV = await UnifiedCVService.getMasterCV(userId);
```

### Updating CV Data

```typescript
// Update CV content
await UnifiedCVService.updateCV(cvId, {
  cvData: {
    ...existingCV.cvData,
    basics: {
      ...existingCV.cvData.basics,
      name: 'Updated Name'
    }
  }
}, userId);

// Update metadata
await UnifiedCVService.updateCV(cvId, {
  metadata: {
    starred: true,
    tags: ['software', 'engineering']
  }
}, userId);
```

## 🔍 Validation

### Schema Validation

```typescript
import { UnifiedCVService } from '@/lib/services/unified-cv-service';

// Validate CV data
const isValid = UnifiedCVService.validateCVData(cvData);

if (!isValid) {
  throw new Error('Invalid CV data structure');
}
```

### Runtime Validation

All API endpoints now validate incoming data against the unified schema:

```typescript
// Automatic validation in API endpoints
const response = await fetch('/api/cvs', {
  method: 'POST',
  body: JSON.stringify(cvData) // Must match UnifiedCVRequest
});
```

## 📈 Benefits

### 1. **Eliminated Data Inconsistencies**
- No more transformation errors
- Consistent data across all modules
- Single source of truth

### 2. **Improved Performance**
- No transformation overhead
- Direct database operations
- Faster API responses

### 3. **Better Developer Experience**
- Clear schema documentation
- Type safety across all modules
- Easier debugging

### 4. **Future-Proof Architecture**
- Easy to add new fields
- Version-controlled schema changes
- Backward compatibility support

## 🛠️ Development Guidelines

### Adding New Fields

1. **Update Schema**: Add field to `UnifiedCVDataStructure`
2. **Update Database**: Add field to MongoDB schema
3. **Update API**: Ensure API handles new field
4. **Update Components**: Update UI to use new field
5. **Update Documentation**: Document the new field

### Schema Changes

1. **Increment Version**: Update `UNIFIED_CV_SCHEMA_VERSION`
2. **Migration Script**: Create migration for existing data
3. **Backward Compatibility**: Support old format during transition
4. **Testing**: Test all modules with new schema

### Code Standards

```typescript
// ✅ Good: Use unified service
const cv = await UnifiedCVService.getCV(cvId, userId);

// ❌ Bad: Use old transformation
const cv = await CVService.getCV(cvId, userId);
const transformed = transformDatabaseToStudio(cv.cvData);
```

## 🔧 Troubleshooting

### Common Issues

1. **Schema Mismatch**: Ensure all modules use unified schema
2. **Validation Errors**: Check data against validation schema
3. **Migration Issues**: Use migration utilities for legacy data

### Debug Tools

```typescript
// Validate data structure
console.log('CV Data Valid:', UnifiedCVService.validateCVData(cvData));

// Check schema version
console.log('Schema Version:', UNIFIED_CV_SCHEMA_VERSION);

// Migrate legacy data
const unifiedData = UnifiedCVService.migrateLegacyData(legacyData);
```

## 📚 Related Documentation

- [Template System Guide](./TEMPLATE_SYSTEM_GUIDE.md)
- [Database Setup Guide](./public/Guides/DATABASE_SETUP.md)
- [API Documentation](./public/Guides/CV_DATA_MANAGEMENT_SPECIFICATION.md)

## 🎯 Next Steps

1. **Complete Component Updates**: Update all remaining components
2. **Parser Integration**: Update CV parser to use unified schema
3. **Testing**: Comprehensive testing across all modules
4. **Documentation**: Update all documentation to reflect unified schema
5. **Performance**: Monitor and optimize performance improvements

---

**Note**: This implementation ensures that all CV-related features operate on a single, well-defined data structure, eliminating transformation inconsistencies and enabling future scalability.
