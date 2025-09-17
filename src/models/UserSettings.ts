import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId | string;
  
  // Security Settings
  security: {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string; // Encrypted
    backupCodes?: string[]; // Encrypted
    lastPasswordChange?: Date;
    loginAttempts: number;
    lockedUntil?: Date;
    trustedDevices: Array<{
      deviceId: string;
      deviceName: string;
      lastUsed: Date;
      ipAddress: string;
      userAgent: string;
    }>;
    securityQuestions: Array<{
      question: string;
      answer: string; // Hashed
    }>;
  };
  
  // Notification Preferences
  notifications: {
    email: {
      enabled: boolean;
      marketing: boolean;
      security: boolean;
      updates: boolean;
      reminders: boolean;
      weeklyDigest: boolean;
    };
    push: {
      enabled: boolean;
      marketing: boolean;
      security: boolean;
      updates: boolean;
      reminders: boolean;
    };
    sms: {
      enabled: boolean;
      security: boolean;
      reminders: boolean;
    };
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
  };
  
  // Privacy Settings
  privacy: {
    profileVisibility: 'public' | 'private' | 'contacts-only';
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    allowSearchEngines: boolean;
    dataSharing: {
      analytics: boolean;
      marketing: boolean;
      thirdParty: boolean;
    };
    cookiePreferences: {
      necessary: boolean;
      functional: boolean;
      analytics: boolean;
      marketing: boolean;
    };
  };
  
  // Application Preferences
  preferences: {
    dashboard: {
      layout: 'grid' | 'list' | 'compact';
      defaultView: 'recent' | 'favorites' | 'all';
      itemsPerPage: number;
      showTutorials: boolean;
    };
    cv: {
      defaultTemplate: string;
      autoSave: boolean;
      autoSaveInterval: number; // minutes
      exportFormat: 'pdf' | 'docx' | 'both';
      watermark: boolean;
    };
    jobSearch: {
      defaultFilters: Record<string, any>;
      autoApply: boolean;
      maxApplicationsPerDay: number;
      preferredJobTypes: string[];
      salaryRange: {
        min: number;
        max: number;
        currency: string;
      };
    };
    accessibility: {
      fontSize: 'small' | 'medium' | 'large';
      highContrast: boolean;
      reducedMotion: boolean;
      screenReader: boolean;
    };
  };
  
  // Communication Preferences
  communication: {
    preferredLanguage: string;
    timezone: string;
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    currency: string;
    numberFormat: 'US' | 'EU' | 'IN';
  };
  
  // Advanced Settings
  advanced: {
    apiAccess: {
      enabled: boolean;
      apiKey?: string; // Encrypted
      rateLimit: number;
      allowedOrigins: string[];
    };
    integrations: {
      linkedin: {
        connected: boolean;
        accessToken?: string; // Encrypted
        lastSync?: Date;
      };
      github: {
        connected: boolean;
        accessToken?: string; // Encrypted
        lastSync?: Date;
      };
      calendar: {
        connected: boolean;
        provider: 'google' | 'outlook' | 'apple';
        accessToken?: string; // Encrypted
      };
    };
    experimental: {
      betaFeatures: boolean;
      aiSuggestions: boolean;
      advancedAnalytics: boolean;
    };
  };
  
  // Audit Trail
  auditLog: Array<{
    action: string;
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    changes: Record<string, any>;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const userSettingsSchema = new Schema<IUserSettings>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: [true, 'User ID is required'],
    unique: true,
    index: true
  },
  
  security: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      select: false // Never include in queries by default
    },
    backupCodes: [{
      type: String,
      select: false // Never include in queries by default
    }],
    lastPasswordChange: Date,
    loginAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    lockedUntil: Date,
    trustedDevices: [{
      deviceId: {
        type: String,
        required: true
      },
      deviceName: {
        type: String,
        required: true,
        trim: true
      },
      lastUsed: {
        type: Date,
        default: Date.now
      },
      ipAddress: {
        type: String,
        required: true
      },
      userAgent: {
        type: String,
        required: true
      }
    }],
    securityQuestions: [{
      question: {
        type: String,
        required: true,
        trim: true
      },
      answer: {
        type: String,
        required: true,
        select: false // Never include in queries by default
      }
    }]
  },
  
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      },
      security: {
        type: Boolean,
        default: true
      },
      updates: {
        type: Boolean,
        default: true
      },
      reminders: {
        type: Boolean,
        default: true
      },
      weeklyDigest: {
        type: Boolean,
        default: false
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      },
      security: {
        type: Boolean,
        default: true
      },
      updates: {
        type: Boolean,
        default: true
      },
      reminders: {
        type: Boolean,
        default: true
      }
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      security: {
        type: Boolean,
        default: true
      },
      reminders: {
        type: Boolean,
        default: false
      }
    },
    frequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'monthly'],
      default: 'immediate'
    }
  },
  
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'private', 'contacts-only'],
      default: 'private'
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showPhone: {
      type: Boolean,
      default: false
    },
    showLocation: {
      type: Boolean,
      default: false
    },
    allowSearchEngines: {
      type: Boolean,
      default: false
    },
    dataSharing: {
      analytics: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      },
      thirdParty: {
        type: Boolean,
        default: false
      }
    },
    cookiePreferences: {
      necessary: {
        type: Boolean,
        default: true
      },
      functional: {
        type: Boolean,
        default: true
      },
      analytics: {
        type: Boolean,
        default: false
      },
      marketing: {
        type: Boolean,
        default: false
      }
    }
  },
  
  preferences: {
    dashboard: {
      layout: {
        type: String,
        enum: ['grid', 'list', 'compact'],
        default: 'grid'
      },
      defaultView: {
        type: String,
        enum: ['recent', 'favorites', 'all'],
        default: 'recent'
      },
      itemsPerPage: {
        type: Number,
        default: 20,
        min: 10,
        max: 100
      },
      showTutorials: {
        type: Boolean,
        default: true
      }
    },
    cv: {
      defaultTemplate: {
        type: String,
        default: 'modern'
      },
      autoSave: {
        type: Boolean,
        default: true
      },
      autoSaveInterval: {
        type: Number,
        default: 5,
        min: 1,
        max: 60
      },
      exportFormat: {
        type: String,
        enum: ['pdf', 'docx', 'both'],
        default: 'pdf'
      },
      watermark: {
        type: Boolean,
        default: false
      }
    },
    jobSearch: {
      defaultFilters: {
        type: Schema.Types.Mixed,
        default: {}
      },
      autoApply: {
        type: Boolean,
        default: false
      },
      maxApplicationsPerDay: {
        type: Number,
        default: 10,
        min: 1,
        max: 50
      },
      preferredJobTypes: [{
        type: String,
        trim: true
      }],
      salaryRange: {
        min: {
          type: Number,
          min: 0
        },
        max: {
          type: Number,
          min: 0
        },
        currency: {
          type: String,
          default: 'USD'
        }
      }
    },
    accessibility: {
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      highContrast: {
        type: Boolean,
        default: false
      },
      reducedMotion: {
        type: Boolean,
        default: false
      },
      screenReader: {
        type: Boolean,
        default: false
      }
    }
  },
  
  communication: {
    preferredLanguage: {
      type: String,
      default: 'en',
      trim: true
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    dateFormat: {
      type: String,
      enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
      default: 'MM/DD/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '12h'
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true
    },
    numberFormat: {
      type: String,
      enum: ['US', 'EU', 'IN'],
      default: 'US'
    }
  },
  
  advanced: {
    apiAccess: {
      enabled: {
        type: Boolean,
        default: false
      },
      apiKey: {
        type: String,
        select: false // Never include in queries by default
      },
      rateLimit: {
        type: Number,
        default: 1000,
        min: 100,
        max: 10000
      },
      allowedOrigins: [{
        type: String,
        trim: true
      }]
    },
    integrations: {
      linkedin: {
        connected: {
          type: Boolean,
          default: false
        },
        accessToken: {
          type: String,
          select: false // Never include in queries by default
        },
        lastSync: Date
      },
      github: {
        connected: {
          type: Boolean,
          default: false
        },
        accessToken: {
          type: String,
          select: false // Never include in queries by default
        },
        lastSync: Date
      },
      calendar: {
        connected: {
          type: Boolean,
          default: false
        },
        provider: {
          type: String,
          enum: ['google', 'outlook', 'apple']
        },
        accessToken: {
          type: String,
          select: false // Never include in queries by default
        }
      }
    },
    experimental: {
      betaFeatures: {
        type: Boolean,
        default: false
      },
      aiSuggestions: {
        type: Boolean,
        default: true
      },
      advancedAnalytics: {
        type: Boolean,
        default: false
      }
    }
  },
  
  auditLog: [{
    action: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      required: true
    },
    changes: {
      type: Schema.Types.Mixed,
      default: {}
    }
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.security?.twoFactorSecret;
      delete ret.security?.backupCodes;
      delete ret.security?.securityQuestions;
      delete ret.advanced?.apiAccess?.apiKey;
      delete ret.advanced?.integrations?.linkedin?.accessToken;
      delete ret.advanced?.integrations?.github?.accessToken;
      delete ret.advanced?.integrations?.calendar?.accessToken;
      return ret;
    }
  }
});

// Indexes for better query performance
userSettingsSchema.index({ userId: 1 });
userSettingsSchema.index({ 'security.twoFactorEnabled': 1 });
userSettingsSchema.index({ 'notifications.email.enabled': 1 });
userSettingsSchema.index({ 'privacy.profileVisibility': 1 });

// Pre-save middleware to log changes
userSettingsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    // Log changes to audit trail
    const changes = this.getChanges();
    if (Object.keys(changes).length > 0) {
      this.auditLog.push({
        action: 'settings_updated',
        timestamp: new Date(),
        ipAddress: 'system', // Will be updated by API
        userAgent: 'system', // Will be updated by API
        changes: changes
      });
      
      // Keep only last 100 audit entries
      if (this.auditLog.length > 100) {
        this.auditLog = this.auditLog.slice(-100);
      }
    }
  }
  next();
});

// Method to get changes
userSettingsSchema.methods.getChanges = function() {
  const changes: Record<string, any> = {};
  const modifiedPaths = this.modifiedPaths();
  
  modifiedPaths.forEach((path: string) => {
    if (!path.startsWith('auditLog') && !path.startsWith('updatedAt')) {
      changes[path] = this.get(path);
    }
  });
  
  return changes;
};

// Method to reset security settings
userSettingsSchema.methods.resetSecurity = function() {
  this.security.twoFactorEnabled = false;
  this.security.twoFactorSecret = undefined;
  this.security.backupCodes = [];
  this.security.trustedDevices = [];
  this.security.securityQuestions = [];
  this.security.loginAttempts = 0;
  this.security.lockedUntil = undefined;
  return this.save();
};

export default mongoose.models.UserSettings || mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);
