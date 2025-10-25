import mongoose, { Document, Schema } from 'mongoose';
import { getLogsConnection } from '@/lib/logs-database-connection';

export interface IAPILog extends Document {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number; // in milliseconds
  userId?: mongoose.Types.ObjectId | string;
  ip?: string;
  userAgent?: string;
  requestSize?: number; // in bytes
  responseSize?: number; // in bytes
  errorMessage?: string;
  timestamp: Date;
}

const apiLogSchema = new Schema<IAPILog>({
  endpoint: {
    type: String,
    required: [true, 'Endpoint is required'],
    index: true
  },
  method: {
    type: String,
    required: [true, 'HTTP method is required'],
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    index: true
  },
  statusCode: {
    type: Number,
    required: [true, 'Status code is required'],
    min: 100,
    max: 599,
    index: true
  },
  responseTime: {
    type: Number,
    required: [true, 'Response time is required'],
    min: 0
  },
  userId: {
    type: Schema.Types.Mixed, // Allow both ObjectId and string
    sparse: true,
    index: true
  },
  ip: {
    type: String,
    trim: true,
    index: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  requestSize: {
    type: Number,
    min: 0
  },
  responseSize: {
    type: Number,
    min: 0
  },
  errorMessage: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 2592000 } // TTL index - 30 days retention
  }
}, {
  timestamps: false // We use custom timestamp field
});

// Compound indexes for efficient querying
apiLogSchema.index({ endpoint: 1, method: 1, timestamp: -1 });
apiLogSchema.index({ statusCode: 1, timestamp: -1 });
apiLogSchema.index({ userId: 1, timestamp: -1 });
apiLogSchema.index({ responseTime: 1, timestamp: -1 });

// Static method to log API request
apiLogSchema.statics.logRequest = async function(logData: {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: mongoose.Types.ObjectId | string;
  ip?: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;
}) {
  try {
    const apiLog = new this({
      ...logData,
      timestamp: new Date()
    });
    
    return await apiLog.save();
  } catch (error) {
    // Don't throw error to avoid breaking the main functionality
    console.error('Error logging API request:', error);
  }
};

// Static method to get API statistics
apiLogSchema.statics.getStats = async function(options: {
  startDate?: Date;
  endDate?: Date;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  userId?: mongoose.Types.ObjectId | string;
}) {
  const match: any = {};
  
  if (options.startDate || options.endDate) {
    match.timestamp = {};
    if (options.startDate) match.timestamp.$gte = options.startDate;
    if (options.endDate) match.timestamp.$lte = options.endDate;
  }
  
  if (options.endpoint) match.endpoint = options.endpoint;
  if (options.method) match.method = options.method;
  if (options.statusCode) match.statusCode = options.statusCode;
  if (options.userId) match.userId = options.userId;

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        maxResponseTime: { $max: '$responseTime' },
        minResponseTime: { $min: '$responseTime' },
        successCount: {
          $sum: { $cond: [{ $gte: ['$statusCode', 200], $lt: ['$statusCode', 400] }, 1, 0] }
        },
        errorCount: {
          $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
        },
        totalRequestSize: { $sum: '$requestSize' },
        totalResponseSize: { $sum: '$responseSize' }
      }
    }
  ]);

  return stats[0] || {
    totalRequests: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: 0,
    successCount: 0,
    errorCount: 0,
    totalRequestSize: 0,
    totalResponseSize: 0
  };
};

// Static method to get top endpoints by usage
apiLogSchema.statics.getTopEndpoints = async function(options: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const match: any = {};
  
  if (options.startDate || options.endDate) {
    match.timestamp = {};
    if (options.startDate) match.timestamp.$gte = options.startDate;
    if (options.endDate) match.timestamp.$lte = options.endDate;
  }

  const pipeline: any[] = [
    { $match: match },
    {
      $group: {
        _id: { endpoint: '$endpoint', method: '$method' },
        requests: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        errorCount: {
          $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
        }
      }
    },
    { $sort: { requests: -1 } }
  ];

  if (options.limit) {
    pipeline.push({ $limit: options.limit });
  }

  return this.aggregate(pipeline);
};

// Create model using logs database connection
let APILog: mongoose.Model<IAPILog> | null = null;

export async function getAPILogModel(): Promise<mongoose.Model<IAPILog>> {
  if (APILog) {
    return APILog;
  }

  const logsConnection = await getLogsConnection();
  APILog = logsConnection.model<IAPILog>('APILog', apiLogSchema);
  return APILog;
}

// Export the schema for use in other files
export { apiLogSchema };
