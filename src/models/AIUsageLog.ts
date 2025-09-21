import mongoose, { Schema, Document } from 'mongoose';

export interface IAIUsageLog extends Document {
  userId: mongoose.Types.ObjectId | string;
  firebaseUid?: string; // Firebase UID for user identification
  apiEndpoint: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  provider: string;
  model: string;
  requestData?: any;
  responseData?: any;
  status: 'success' | 'error';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const aiUsageLogSchema = new Schema<IAIUsageLog>({
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    required: true,
    index: true
  },
  firebaseUid: {
    type: String,
    sparse: true, // Allows multiple null values
    index: true // Index for efficient Firebase UID queries
  },
  apiEndpoint: {
    type: String,
    required: true,
    index: true
  },
  tokensUsed: {
    prompt: {
      type: Number,
      required: true,
      default: 0
    },
    completion: {
      type: Number,
      required: true,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      default: 0
    }
  },
  cost: {
    type: Number,
    required: true,
    default: 0
  },
  provider: {
    type: String,
    required: true,
    enum: ['openai', 'google', 'anthropic'],
    default: 'openai'
  },
  model: {
    type: String,
    required: true
  },
  requestData: {
    type: Schema.Types.Mixed
  },
  responseData: {
    type: Schema.Types.Mixed
  },
  status: {
    type: String,
    required: true,
    enum: ['success', 'error'],
    default: 'success'
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
aiUsageLogSchema.index({ createdAt: -1 });
aiUsageLogSchema.index({ userId: 1, createdAt: -1 });
aiUsageLogSchema.index({ apiEndpoint: 1, createdAt: -1 });
aiUsageLogSchema.index({ provider: 1, createdAt: -1 });

// Virtual for cost per token
aiUsageLogSchema.virtual('costPerToken').get(function() {
  return this.tokensUsed.total > 0 ? this.cost / this.tokensUsed.total : 0;
});

// Static method to get usage statistics
aiUsageLogSchema.statics.getUsageStats = async function(options: {
  userId?: mongoose.Types.ObjectId | string;
  startDate?: Date;
  endDate?: Date;
  apiEndpoint?: string;
  provider?: string;
}) {
  const match: any = {};
  
  if (options.userId) match.userId = options.userId;
  if (options.apiEndpoint) match.apiEndpoint = options.apiEndpoint;
  if (options.provider) match.provider = options.provider;
  if (options.startDate || options.endDate) {
    match.createdAt = {};
    if (options.startDate) match.createdAt.$gte = options.startDate;
    if (options.endDate) match.createdAt.$lte = options.endDate;
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: '$tokensUsed.total' },
        totalCost: { $sum: '$cost' },
        avgTokensPerRequest: { $avg: '$tokensUsed.total' },
        avgCostPerRequest: { $avg: '$cost' },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        errorCount: {
          $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    avgTokensPerRequest: 0,
    avgCostPerRequest: 0,
    successCount: 0,
    errorCount: 0
  };
};

// Static method to get usage by endpoint
aiUsageLogSchema.statics.getUsageByEndpoint = async function(options: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const match: any = {};
  
  if (options.startDate || options.endDate) {
    match.createdAt = {};
    if (options.startDate) match.createdAt.$gte = options.startDate;
    if (options.endDate) match.createdAt.$lte = options.endDate;
  }

  const pipeline: any[] = [
    { $match: match },
    {
      $group: {
        _id: '$apiEndpoint',
        requests: { $sum: 1 },
        tokens: { $sum: '$tokensUsed.total' },
        cost: { $sum: '$cost' },
        avgTokensPerRequest: { $avg: '$tokensUsed.total' }
      }
    },
    { $sort: { cost: -1 } }
  ];

  if (options.limit) {
    pipeline.push({ $limit: options.limit });
  }

  return this.aggregate(pipeline);
};

// Static method to get usage by user
aiUsageLogSchema.statics.getUsageByUser = async function(options: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const match: any = {};
  
  if (options.startDate || options.endDate) {
    match.createdAt = {};
    if (options.startDate) match.createdAt.$gte = options.startDate;
    if (options.endDate) match.createdAt.$lte = options.endDate;
  }

  const pipeline: any[] = [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $group: {
        _id: '$userId',
        userName: { $first: '$user.name' },
        requests: { $sum: 1 },
        tokens: { $sum: '$tokensUsed.total' },
        cost: { $sum: '$cost' },
        avgTokensPerRequest: { $avg: '$tokensUsed.total' }
      }
    },
    { $sort: { cost: -1 } }
  ];

  if (options.limit) {
    pipeline.push({ $limit: options.limit });
  }

  return this.aggregate(pipeline);
};

// Static method to get daily usage
aiUsageLogSchema.statics.getDailyUsage = async function(options: {
  startDate?: Date;
  endDate?: Date;
  days?: number;
}) {
  let startDate = options.startDate;
  let endDate = options.endDate;

  if (options.days && !startDate && !endDate) {
    endDate = new Date();
    startDate = new Date(endDate.getTime() - options.days * 24 * 60 * 60 * 1000);
  }

  const match: any = {};
  
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        },
        requests: { $sum: 1 },
        tokens: { $sum: '$tokensUsed.total' },
        cost: { $sum: '$cost' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

export default mongoose.models.AIUsageLog || mongoose.model<IAIUsageLog>('AIUsageLog', aiUsageLogSchema); 