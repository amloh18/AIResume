# Tiptap Integration Guide

## Overview

This guide explains how to use the **Tiptap rich text editor** integration in your CV builder application. Tiptap provides inline WYSIWYG editing with formatting capabilities like bold, italic, underline, text alignment, and bullet lists.

## 🎯 Features

### Rich Text Editing
- **Bold, Italic, Underline** formatting
- **Text alignment** (left, center, right)
- **Bullet and numbered lists**
- **Inline editing** directly on the CV canvas
- **Template-aware styling**

### Smart Field Detection
The system automatically detects which fields should use rich text editing:
- **Summary fields** - Professional summaries, descriptions
- **Detail fields** - Job descriptions, education details
- **Simple fields** - Names, titles, contact info (use simple text)

## 🧱 Components

### 1. TiptapEditor
The core rich text editor component with toolbar.

```tsx
<TiptapEditor
  value={htmlContent}
  onChange={(newHtml) => updateContent(newHtml)}
  placeholder="Write something..."
  isPreview={false}
  className="template-class"
  templateId="modernProfessional"
  elementType="summary"
/>
```

### 2. EnhancedEditableField
Smart wrapper that chooses between simple text and rich text editing.

```tsx
<EnhancedEditableField
  value={content}
  onChange={handleChange}
  multiline={true}
  templateId="modernProfessional"
  elementType="summary" // Determines if rich text is used
/>
```

### 3. TiptapToolbar
Floating toolbar with formatting buttons (appears when editing).

## 🎨 Template Styling

### Dynamic CSS Classes
The system applies template-specific CSS classes:

```css
/* Modern Professional Template */
.desc-modern-professional {
  font-size: 14px;
  color: #444;
  line-height: 1.6;
}

.name-modern-professional {
  font-weight: 700;
  font-size: 24px;
  color: #1a1a1a;
}

/* Classic Elegant Template */
.desc-classic-elegant {
  font-size: 13px;
  color: #555;
  line-height: 1.5;
  font-style: italic;
}
```

### Element Type Mapping
- `summary` → Rich text editing
- `description` → Rich text editing  
- `details` → Rich text editing
- `name` → Simple text editing
- `title` → Simple text editing
- `contact` → Simple text editing

## 📝 Usage Examples

### 1. Profile Summary (Rich Text)
```tsx
<EnhancedEditableField
  value={profileData.summary}
  onChange={(value) => updateProfile('summary', value)}
  multiline={true}
  templateId="modernProfessional"
  elementType="summary" // Triggers rich text editing
/>
```

### 2. Job Description (Rich Text)
```tsx
<EnhancedEditableField
  value={jobDetail}
  onChange={(value) => updateJobDetail(value)}
  multiline={true}
  templateId="modernProfessional"
  elementType="description" // Triggers rich text editing
/>
```

### 3. Name Field (Simple Text)
```tsx
<EnhancedEditableField
  value={profileData.name}
  onChange={(value) => updateProfile('name', value)}
  templateId="modernProfessional"
  elementType="name" // Uses simple text editing
/>
```

## 🔧 Configuration

### Tiptap Extensions
The editor includes these extensions:
- **StarterKit** - Basic formatting (bold, italic, etc.)
- **Underline** - Underline text
- **TextAlign** - Text alignment options
- **Placeholder** - Placeholder text

### Adding New Extensions
To add more formatting options:

1. Install the extension:
```bash
npm install @tiptap/extension-heading @tiptap/extension-link
```

2. Update `TiptapEditor.tsx`:
```tsx
import Heading from '@tiptap/extension-heading';
import Link from '@tiptap/extension-link';

// Add to extensions array
extensions: [
  StarterKit,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Placeholder.configure({ placeholder }),
  Heading.configure({ levels: [1, 2, 3] }),
  Link.configure({ openOnClick: false })
]
```

3. Add toolbar buttons in `TiptapToolbar.tsx`

## 💾 Data Storage

### HTML Format
Content is stored as HTML in MongoDB:

```json
{
  "sections": {
    "profile": {
      "summary": "<p>This is a <strong>professional summary</strong> with <em>formatting</em>.</p>"
    },
    "experience": {
      "entries": [
        {
          "description": "<ul><li>First achievement</li><li>Second achievement</li></ul>"
        }
      ]
    }
  }
}
```

### JSON Format (Alternative)
For more control, you can store as JSON:

```tsx
const json = editor.getJSON();
// Store json instead of HTML
```

## 🎯 Best Practices

### 1. Field Selection
- Use rich text for **descriptive content** (summaries, descriptions)
- Use simple text for **short fields** (names, titles, dates)

### 2. Template Integration
- Always pass `templateId` for consistent styling
- Use appropriate `elementType` for automatic field detection

### 3. Performance
- Rich text fields are only initialized when needed
- Toolbar appears only during editing

### 4. Accessibility
- Toolbar buttons include proper titles
- Keyboard navigation supported
- Screen reader friendly

## 🧪 Testing

### Test Page
Visit `/test-tiptap` to test the integration:

- Simple text fields
- Rich text fields with formatting
- Template styling
- Real-time preview

### Manual Testing
1. Click on a summary field
2. Verify toolbar appears
3. Test formatting buttons
4. Check template styling
5. Verify content saves correctly

## 🐛 Troubleshooting

### Common Issues

1. **Toolbar not appearing**
   - Check if field is multiline
   - Verify elementType triggers rich text

2. **Styling not applied**
   - Ensure templateId is passed
   - Check CSS class names

3. **Content not saving**
   - Verify onChange handler
   - Check HTML format

4. **Performance issues**
   - Limit rich text fields
   - Use simple text for short content

## 📚 API Reference

### TiptapEditor Props
```tsx
interface TiptapEditorProps {
  value: string;                    // HTML content
  onChange: (value: string) => void; // Update handler
  placeholder?: string;             // Placeholder text
  isPreview?: boolean;              // Preview mode
  className?: string;               // CSS classes
  style?: React.CSSProperties;      // Inline styles
  onContentSelect?: Function;       // Selection handler
  sectionKey?: string;              // Section identifier
  elementType?: string;             // Field type
  isSelected?: boolean;             // Selection state
  editable?: boolean;               // Edit mode
}
```

### EnhancedEditableField Props
```tsx
interface EnhancedEditableFieldProps {
  value: string;                    // Field value
  onChange: (value: string) => void; // Update handler
  placeholder?: string;             // Placeholder text
  multiline?: boolean;              // Multiline mode
  isPreview?: boolean;              // Preview mode
  style?: React.CSSProperties;      // Inline styles
  className?: string;               // CSS classes
  onContentSelect?: Function;       // Selection handler
  sectionKey?: string;              // Section identifier
  elementType?: string;             // Field type
  isSelected?: boolean;             // Selection state
  useRichText?: boolean;            // Force rich text
  templateId?: string;              // Template identifier
}
```

## 🚀 Future Enhancements

### Planned Features
- **Image support** - Add images to CV sections
- **Table support** - Create formatted tables
- **Code highlighting** - For technical skills
- **Custom extensions** - Template-specific formatting
- **Export formatting** - Preserve formatting in PDF export

### Customization Options
- **Custom toolbar** - Template-specific buttons
- **Format presets** - Pre-defined styling
- **Auto-save** - Real-time content saving
- **Version history** - Track content changes

---

This integration provides a powerful, user-friendly rich text editing experience while maintaining the flexibility and performance of your CV builder application. 