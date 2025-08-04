# Snippets System Guide

## Overview

The Snippets System is a comprehensive library of CV section designs based on multiple templates. It provides users with access to pre-designed sections that can be used to build professional CVs with consistent styling and layout.

## Features

### 🎨 **Section-Based Design**
- **Personal Information**: Headers with contact details and professional titles
- **Education**: Timeline and card-based layouts for academic information
- **Experience**: Traditional and modern layouts for work history
- **Skills**: Simple lists and visual progress indicators
- **Projects**: Portfolio-style layouts for showcasing work
- **Summary**: Professional summary sections with clean typography

### 🔐 **Access Control**
- **Free**: Basic sections available to all users
- **Day Pass**: Premium sections for users with day pass access
- **Pro**: Advanced sections exclusively for pro users

### 📊 **Template Integration**
- Based on 8 different CV templates from the `/public/CV templates/` directory
- Each template has multiple section variations
- Consistent styling across all sections

## Database Schema

### Snippet Model Structure

```typescript
interface ISnippet {
  name: string;                    // Section name
  description: string;             // Section description
  category: 'section' | 'template' | 'layout';
  sectionType: 'personal' | 'education' | 'experience' | 'skills' | 'projects' | 'summary' | 'contact';
  templateId: string;              // Unique identifier
  templateName: string;            // Source template name
  templateImage: string;           // Template preview image
  layout: {
    columns: number;               // 1-3 columns
    position: 'top' | 'middle' | 'bottom' | 'sidebar' | 'full-width';
    alignment: 'left' | 'center' | 'right' | 'justify';
    spacing: 'compact' | 'normal' | 'spacious';
  };
  styling: {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    borderStyle: 'none' | 'solid' | 'dashed' | 'dotted';
    borderColor: string;
    borderRadius: number;
    shadow: 'none' | 'light' | 'medium' | 'heavy';
    typography: {
      fontFamily: string;
      fontSize: string;
      fontWeight: string;
      lineHeight: string;
    };
  };
  content: {
    title: string;
    subtitle?: string;
    fields: Array<{
      name: string;
      type: 'text' | 'email' | 'phone' | 'url' | 'date' | 'location' | 'list' | 'paragraph';
      required: boolean;
      placeholder: string;
      validation?: string;
    }>;
  };
  accessLevel: 'day-pass' | 'pro' | 'all';
  isActive: boolean;
  isPremium: boolean;
  tags: string[];
  usageCount: number;
  rating: number;
}
```

## API Endpoints

### GET `/api/snippets`

Fetch snippets with filtering and pagination.

**Query Parameters:**
- `category`: Filter by category (section, template, layout)
- `sectionType`: Filter by section type (personal, education, etc.)
- `accessLevel`: Filter by access level (all, day-pass, pro)
- `templateId`: Filter by specific template
- `tags`: Filter by tags (comma-separated)
- `limit`: Number of results per page (default: 50)
- `page`: Page number (default: 1)
- `sortBy`: Sort field (default: usageCount)
- `sortOrder`: Sort direction (asc/desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 80,
    "itemsPerPage": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### POST `/api/snippets`

Create a new snippet.

**Request Body:**
```json
{
  "name": "Custom Section",
  "description": "A custom section design",
  "category": "section",
  "sectionType": "personal",
  "templateId": "unique-id",
  "templateName": "Template Name",
  "templateImage": "/path/to/image.jpg",
  "layout": {...},
  "styling": {...},
  "content": {...},
  "accessLevel": "all",
  "tags": ["custom", "modern"]
}
```

## Usage Examples

### Fetching Snippets

```javascript
// Fetch all personal information sections
const response = await fetch('/api/snippets?sectionType=personal');
const data = await response.json();

// Fetch pro-level experience sections
const response = await fetch('/api/snippets?sectionType=experience&accessLevel=pro');
const data = await response.json();

// Search for modern sections
const response = await fetch('/api/snippets?tags=modern&sortBy=rating&sortOrder=desc');
const data = await response.json();
```

### Using Snippets in Components

```typescript
import { useState, useEffect } from 'react';

const SnippetsComponent = () => {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSnippets();
  }, []);

  const fetchSnippets = async () => {
    try {
      const response = await fetch('/api/snippets?category=section');
      const data = await response.json();
      if (data.success) {
        setSnippets(data.data);
      }
    } catch (error) {
      console.error('Error fetching snippets:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {snippets.map(snippet => (
        <div key={snippet._id}>
          <h3>{snippet.name}</h3>
          <p>{snippet.description}</p>
          {/* Render snippet preview */}
        </div>
      ))}
    </div>
  );
};
```

## Database Population

### Running the Population Script

```bash
# Populate the database with snippets
node scripts/populate-snippets-simple.js
```

This script will:
1. Connect to MongoDB
2. Clear existing snippets
3. Create snippets for each template and section combination
4. Generate random usage counts and ratings
5. Apply appropriate access levels

### Current Statistics

- **Total Snippets**: 80
- **Free Snippets**: 40 (50%)
- **Day Pass Snippets**: 32 (40%)
- **Pro Snippets**: 8 (10%)

## Template Sources

The snippets are based on the following CV templates:

1. **Modern Minimalist** - Clean and professional minimalist design
2. **Creative Modern** - Creative and modern design with visual elements
3. **Professional Executive** - Executive-level professional template
4. **ATS Friendly** - Optimized for Applicant Tracking Systems
5. **Modern Google Docs** - Modern template compatible with Google Docs
6. **Social Media Marketing** - Designed for social media and marketing professionals
7. **Engineer Skilled** - Specialized template for engineering professionals
8. **Data Analyst** - Optimized for data analysis and financial roles

## Section Types

### Personal Information
- **Modern Header**: Clean header with centered layout
- **Creative Header**: Creative header with visual elements

### Education
- **Timeline Education**: Timeline-based layout
- **Card Education**: Card-based layout with visual elements

### Experience
- **Traditional Experience**: Classic experience layout
- **Modern Experience**: Modern experience with visual elements

### Skills
- **Simple Skills**: Clean list layout
- **Visual Skills**: Visual progress indicators

### Projects
- **Project Portfolio**: Portfolio-style layout

### Summary
- **Professional Summary**: Clean typography-focused layout

## Styling System

### Layout Options
- **Columns**: 1-3 column layouts
- **Position**: top, middle, bottom, sidebar, full-width
- **Alignment**: left, center, right, justify
- **Spacing**: compact, normal, spacious

### Visual Elements
- **Colors**: Background, text, and accent colors
- **Borders**: Style, color, and border radius
- **Shadows**: none, light, medium, heavy
- **Typography**: Font family, size, weight, and line height

## Best Practices

### For Developers
1. **Access Control**: Always check user access level before displaying snippets
2. **Performance**: Use pagination for large snippet lists
3. **Caching**: Cache frequently accessed snippets
4. **Validation**: Validate snippet data before saving

### For Users
1. **Template Consistency**: Use snippets from the same template for consistency
2. **Access Level**: Choose snippets appropriate for your access level
3. **Customization**: Modify snippet styling to match your brand
4. **Content**: Fill in all required fields for best results

## Future Enhancements

### Planned Features
- **User-Created Snippets**: Allow users to create and share custom snippets
- **Snippet Collections**: Group related snippets into collections
- **Advanced Filtering**: More sophisticated search and filter options
- **Snippet Analytics**: Track usage patterns and popular snippets
- **Export Options**: Export snippets for use in other applications

### Integration Opportunities
- **CV Studio**: Direct integration with CV Studio for seamless editing
- **Template System**: Integration with the broader template system
- **AI Suggestions**: AI-powered snippet recommendations
- **Community Features**: User ratings and reviews for snippets

## Troubleshooting

### Common Issues

1. **Snippet Not Loading**
   - Check network connectivity
   - Verify API endpoint is accessible
   - Check user access level

2. **Styling Issues**
   - Verify CSS classes are properly applied
   - Check for conflicting styles
   - Ensure responsive design considerations

3. **Database Issues**
   - Verify MongoDB connection
   - Check snippet schema validation
   - Ensure proper indexing

### Support

For technical support or questions about the snippets system, please refer to the main documentation or contact the development team. 