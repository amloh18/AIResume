import mongoose, { Schema, Document } from 'mongoose';

export interface ISnippet extends Document {
  name: string;
  description: string;
  category: 'section' | 'template' | 'layout';
  sectionType: 'personal' | 'education' | 'experience' | 'skills' | 'projects' | 'summary' | 'contact';
  templateId: string;
  templateName: string;
  templateImage: string;
  layout: {
    columns: number;
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
  createdAt: Date;
  updatedAt: Date;
}

const SnippetSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['section', 'template', 'layout'],
    required: true
  },
  sectionType: {
    type: String,
    enum: ['personal', 'education', 'experience', 'skills', 'projects', 'summary', 'contact'],
    required: true
  },
  templateId: {
    type: String,
    required: true,
    unique: true
  },
  templateName: {
    type: String,
    required: true
  },
  templateImage: {
    type: String,
    required: true
  },
  layout: {
    columns: {
      type: Number,
      default: 1,
      min: 1,
      max: 3
    },
    position: {
      type: String,
      enum: ['top', 'middle', 'bottom', 'sidebar', 'full-width'],
      default: 'middle'
    },
    alignment: {
      type: String,
      enum: ['left', 'center', 'right', 'justify'],
      default: 'left'
    },
    spacing: {
      type: String,
      enum: ['compact', 'normal', 'spacious'],
      default: 'normal'
    }
  },
  styling: {
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    textColor: {
      type: String,
      default: '#000000'
    },
    accentColor: {
      type: String,
      default: '#3b82f6'
    },
    borderStyle: {
      type: String,
      enum: ['none', 'solid', 'dashed', 'dotted'],
      default: 'none'
    },
    borderColor: {
      type: String,
      default: '#e5e7eb'
    },
    borderRadius: {
      type: Number,
      default: 0,
      min: 0,
      max: 20
    },
    shadow: {
      type: String,
      enum: ['none', 'light', 'medium', 'heavy'],
      default: 'none'
    },
    typography: {
      fontFamily: {
        type: String,
        default: 'Inter'
      },
      fontSize: {
        type: String,
        default: '14px'
      },
      fontWeight: {
        type: String,
        default: '400'
      },
      lineHeight: {
        type: String,
        default: '1.5'
      }
    }
  },
  content: {
    title: {
      type: String,
      required: true
    },
    subtitle: {
      type: String
    },
    fields: [{
      name: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['text', 'email', 'phone', 'url', 'date', 'location', 'list', 'paragraph'],
        required: true
      },
      required: {
        type: Boolean,
        default: false
      },
      placeholder: {
        type: String,
        default: ''
      },
      validation: {
        type: String
      }
    }]
  },
  accessLevel: {
    type: String,
    enum: ['day-pass', 'pro', 'all'],
    default: 'all'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  usageCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  }
}, {
  timestamps: true
});

// Index for efficient queries
SnippetSchema.index({ category: 1, sectionType: 1, accessLevel: 1, isActive: 1 });
SnippetSchema.index({ templateId: 1 });
SnippetSchema.index({ tags: 1 });

export default mongoose.models.Snippet || mongoose.model<ISnippet>('Snippet', SnippetSchema); 