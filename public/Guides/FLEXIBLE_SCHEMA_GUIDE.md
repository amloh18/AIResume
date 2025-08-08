# 🏛️ Flexible Document Schema System

This guide explains the highly flexible schema design that separates **content structure** from **rendering rules and available options**. This system allows you to build almost any kind of document, not just CVs.

## 🎯 Core Architectural Concept

Instead of having fixed fields like `experience` or `education` on your document model, the main **`content`** of a document is a single array. Each element in this array represents a **section** of the document (e.g., a summary, a list of jobs, a gallery of projects).

The **`Template`** collection defines the "building blocks" (the available section types) and the overall visual theme (styles). The **`Document`** collection references a template and then uses these building blocks to construct its unique content.

## 🗄️ Database Schema Overview

### Templates Collection (`templates`)

Templates define what sections can be added and how they should look:

```javascript
{
  name: "Modern CV",
  category: "cv",
  globalStyles: {
    fontFamily: "Inter, system-ui, sans-serif",
    primaryColor: "#2563eb",
    // ... other style properties
  },
  availableSections: [
    {
      key: "experience",
      displayName: "Work Experience",
      componentName: "ExperienceSection",
      isList: true,
      defaultItemContent: {
        jobTitle: "",
        company: "",
        // ... other fields
      }
    }
    // ... other sections
  ]
}
```

### Documents Collection (`documents`)

Documents store the actual content created by users:

```javascript
{
  userId: ObjectId,
  templateId: ObjectId,
  title: "My Professional CV",
  content: [
    {
      sectionKey: "experience",
      items: [
        {
          jobTitle: "Software Engineer",
          company: "Tech Corp",
          // ... other data
        }
      ],
      styles: { /* optional section-specific styles */ }
    }
    // ... other sections
  ]
}
```

## 🚀 Key Features

### 1. **Dynamic Section Management**
- Add/remove sections on the fly
- Reorder sections with drag-and-drop
- Each section can be a single content block or a list of items

### 2. **Template-Driven Rendering**
- Templates define available section types
- Global styles are applied from the template
- Section-specific styles can override global styles

### 3. **Flexible Content Structure**
- No predefined fields - everything is configurable
- Support for different data types (text, arrays, booleans)
- Validation rules per section (min/max items)

### 4. **Multi-Document Type Support**
- CVs, Portfolios, Cover Letters, Resumes
- Custom document types
- Each type can have its own section definitions

## 📝 Usage Examples

### Creating a New Document

```javascript
// 1. Get available templates
const templates = await fetch('/api/templates?category=cv');

// 2. Create a new document
const document = await fetch('/api/documents', {
  method: 'POST',
  body: JSON.stringify({
    templateId: 'template_id_here',
    title: 'My Professional CV',
    description: 'A comprehensive CV for software engineering roles'
  })
});
```

### Adding a Section

```javascript
// Add a new section to the document
await fetch(`/api/documents/${documentId}/sections`, {
  method: 'POST',
  body: JSON.stringify({
    sectionKey: 'experience'
  })
});
```

### Updating Section Content

```javascript
// Update the content of a specific section
await fetch(`/api/documents/${documentId}/sections/experience`, {
  method: 'PUT',
  body: JSON.stringify({
    items: [
      {
        jobTitle: 'Senior Software Engineer',
        company: 'Tech Corp',
        startDate: '2020-01',
        endDate: '2023-12',
        description: 'Led development of...'
      }
    ]
  })
});
```

### Reordering Sections

```javascript
// Reorder sections in the document
await fetch(`/api/documents/${documentId}/sections`, {
  method: 'PUT',
  body: JSON.stringify({
    newOrder: ['personal_info', 'summary', 'experience', 'education']
  })
});
```

## 🎨 Template Configuration

### Section Blueprint Structure

```javascript
{
  key: "unique_section_identifier",
  displayName: "User-friendly name",
  componentName: "ReactComponentName",
  isList: true, // Can contain multiple items
  defaultItemContent: {
    // Default structure for new items
    field1: "",
    field2: [],
    field3: false
  },
  description: "Help text for users",
  icon: "icon-name",
  category: "professional",
  maxItems: 10, // Optional limit
  minItems: 1   // Optional minimum
}
```

### Global Styles Configuration

```javascript
{
  globalStyles: {
    fontFamily: "Inter, system-ui, sans-serif",
    primaryColor: "#2563eb",
    secondaryColor: "#64748b",
    backgroundColor: "#ffffff",
    fontSize: "14px",
    lineHeight: "1.6",
    spacing: "24px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    customCSS: "/* Additional custom styles */"
  }
}
```

## 🔧 API Endpoints

### Documents
- `GET /api/documents` - List user's documents
- `POST /api/documents` - Create new document
- `GET /api/documents/[id]` - Get specific document
- `PUT /api/documents/[id]` - Update document
- `DELETE /api/documents/[id]` - Delete document

### Sections
- `POST /api/documents/[id]/sections` - Add new section
- `PUT /api/documents/[id]/sections` - Reorder sections
- `PUT /api/documents/[id]/sections/[sectionKey]` - Update section
- `DELETE /api/documents/[id]/sections/[sectionKey]` - Remove section

### Templates
- `GET /api/templates` - List available templates
- `POST /api/templates` - Create new template (admin)
- `GET /api/templates/[id]` - Get specific template

## 🎯 Benefits of This Approach

### 1. **Maximum Flexibility**
- No hardcoded fields or structures
- Easy to add new document types
- Support for any content structure

### 2. **Separation of Concerns**
- Content structure is separate from presentation
- Templates handle styling and available options
- Documents focus purely on content

### 3. **Scalability**
- Easy to add new section types
- Templates can be shared and reused
- Version control for templates

### 4. **User Experience**
- Intuitive section-based editing
- Real-time preview with template styles
- Drag-and-drop reordering

### 5. **Developer Experience**
- Clean, maintainable code
- Type-safe with TypeScript interfaces
- Comprehensive API for all operations

## 🛠️ Implementation Notes

### Frontend Components
- Use the `FlexibleDocumentEditor` component for document editing
- Create section-specific components based on `componentName`
- Implement drag-and-drop for section reordering

### Backend Services
- Use the `DocumentService` class for document operations
- Validate content against template constraints
- Handle section metadata and versioning

### Database Considerations
- Index on `userId`, `templateId`, and `status` for performance
- Use MongoDB's flexible schema to your advantage
- Consider aggregation pipelines for complex queries

## 🚀 Getting Started

1. **Populate Templates**: Run the template population script
   ```bash
   node scripts/populate-templates.js
   ```

2. **Create Documents**: Use the API to create documents from templates

3. **Build UI**: Use the provided React components for editing

4. **Customize**: Add new section types and templates as needed

This flexible schema system provides a solid foundation for building any type of document editor while maintaining clean separation between content and presentation. 