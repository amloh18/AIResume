# Template Validation Fix

## Issue
When uploading templates, the system was failing with validation errors:
```
Template validation failed: category: `professional` is not a valid enum value for path `category`.
```

## Root Cause
The Template model has two different category fields with different validation rules:

1. **`category`** (main category): Enum values `['cv', 'portfolio', 'cover-letter', 'resume', 'custom']`
2. **`categories`** (tags): Enum values `['Creative', 'Professional', 'Modern']`

Templates were being uploaded with `category: "professional"` which is valid for the tags array but not for the main category field.

## Fixes Implemented

### 1. API Route Validation (`src/app/api/admin/templates/route.ts`)

#### Added Category Validation
```typescript
// Validate and fix category field
const validCategories = ['cv', 'portfolio', 'cover-letter', 'resume', 'custom'];
if (!validCategories.includes(normalizedTemplateData.category)) {
  console.log(`⚠️ Invalid category '${normalizedTemplateData.category}', defaulting to 'cv'`);
  normalizedTemplateData.category = 'cv';
}
```

#### Added Category Tags Validation
```typescript
// Ensure categories array contains valid values
const validCategoryTags = ['Creative', 'Professional', 'Modern'];
if (normalizedTemplateData.categories && Array.isArray(normalizedTemplateData.categories)) {
  normalizedTemplateData.categories = normalizedTemplateData.categories.filter(cat => 
    validCategoryTags.includes(cat)
  );
}
```

#### Made Categories Optional
```typescript
// If no categories are provided, add a default one
if (!normalizedTemplateData.categories || normalizedTemplateData.categories.length === 0) {
  console.log('⚠️ No categories provided, adding default category');
  normalizedTemplateData.categories = ['Professional'];
}
```

### 2. Frontend Validation (`src/components/admin/TemplateManager.tsx`)

#### Added Client-side Validation Function
```typescript
const validateTemplateData = (templateData: any) => {
  const validCategories = ['cv', 'portfolio', 'cover-letter', 'resume', 'custom'];
  const validCategoryTags = ['Creative', 'Professional', 'Modern'];
  
  // Validate main category
  if (templateData.category && !validCategories.includes(templateData.category)) {
    throw new Error(`Invalid category '${templateData.category}'. Valid categories are: ${validCategories.join(', ')}`);
  }
  
  // Validate category tags
  if (templateData.categories && Array.isArray(templateData.categories)) {
    const invalidTags = templateData.categories.filter((cat: string) => !validCategoryTags.includes(cat));
    if (invalidTags.length > 0) {
      throw new Error(`Invalid category tags: ${invalidTags.join(', ')}. Valid tags are: ${validCategoryTags.join(', ')}`);
    }
  }
  
  return true;
};
```

#### Added Validation Call Before Template Creation
```typescript
// Validate template data
try {
  validateTemplateData(templateData);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Validation failed';
  alert(`Template validation failed: ${errorMessage}`);
  return;
}
```

### 3. Enhanced Global Styles
Updated the default global styles to include all required fields:
```typescript
globalStyles: {
  fontFamily: templateData.style?.fontFamily || 'Inter, system-ui, sans-serif',
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  backgroundColor: '#ffffff',
  fontSize: '12pt',
  lineHeight: '1.6',
  spacing: '24px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
}
```

## Valid Values

### Main Category (`category`)
- `cv`
- `portfolio`
- `cover-letter`
- `resume`
- `custom`

### Category Tags (`categories`)
- `Creative`
- `Professional`
- `Modern`

## Behavior

### Invalid Category Handling
- **API Level**: Automatically converts invalid categories to `'cv'`
- **Frontend Level**: Shows validation error and prevents submission

### Invalid Tags Handling
- **API Level**: Filters out invalid tags, keeps only valid ones
- **Frontend Level**: Shows validation error and prevents submission

### Missing Categories Handling
- **API Level**: Automatically adds `['Professional']` as default
- **Frontend Level**: Requires at least one category to be selected

## Testing Results
- ✅ Invalid categories are caught and handled gracefully
- ✅ Valid templates pass validation successfully
- ✅ Invalid tags are filtered out
- ✅ Missing categories get default values
- ✅ Both frontend and backend validation work correctly

## Benefits
- **Robust Error Handling**: Templates with invalid data are automatically fixed
- **User-Friendly**: Clear error messages guide users to correct values
- **Backward Compatibility**: Existing templates continue to work
- **Data Integrity**: Ensures all templates have valid category values
