/**
 * Activity Logging Service
 * Unified service for logging all types of activities
 */

import ActivityLog, { IActivityLog, LogType, LogStatus } from '@/models/ActivityLog';
import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';

export interface LogActivityParams {
  logType: LogType;
  userId?: string | mongoose.Types.ObjectId;
  userEmail?: string;
  sessionId?: string;
  ipAddress?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  resource?: {
    type: 'cv' | 'cover_letter' | 'job' | 'journey' | 'user' | 'campaign' | 'plan' | 'other';
    id?: string | mongoose.Types.ObjectId;
    name?: string;
  };
  action: string;
  status: LogStatus;
  errorMessage?: string;
  aiMetadata?: {
    model?: string;
    tokensUsed?: number;
    cost?: number;
    prompt?: string;
    responseLength?: number;
  };
  apiMetadata?: {
    requestSize?: number;
    responseSize?: number;
    errorCode?: string;
    userAgent?: string;
  };
  exportMetadata?: {
    format?: 'pdf' | 'docx' | 'txt';
    templateUsed?: string;
    fileSize?: number;
  };
  paymentMetadata?: {
    amount?: number;
    currency?: string;
    provider?: 'stripe' | 'razorpay';
    transactionId?: string;
    planKey?: string;
  };
  adminMetadata?: {
    adminUserId?: string | mongoose.Types.ObjectId;
    adminEmail?: string;
    targetUserId?: string | mongoose.Types.ObjectId;
    actionType?: string;
  };
  metadata?: Record<string, any>;
  tags?: string[];
}

export class ActivityLogService {
  /**
   * Log an activity
   */
  static async log(params: LogActivityParams): Promise<void> {
    try {
      await getConnection();

      const logData: Partial<IActivityLog> = {
        logType: params.logType,
        timestamp: new Date(),
        action: params.action,
        status: params.status,
      };

      if (params.userId) {
        logData.userId = typeof params.userId === 'string' 
          ? new mongoose.Types.ObjectId(params.userId)
          : params.userId;
      }

      if (params.userEmail) {
        logData.userEmail = params.userEmail;
      }

      if (params.sessionId) {
        logData.sessionId = params.sessionId;
      }

      if (params.ipAddress) {
        logData.ipAddress = params.ipAddress;
      }

      if (params.endpoint) {
        logData.endpoint = params.endpoint;
      }

      if (params.method) {
        logData.method = params.method;
      }

      if (params.statusCode !== undefined) {
        logData.statusCode = params.statusCode;
      }

      if (params.responseTime !== undefined) {
        logData.responseTime = params.responseTime;
      }

      if (params.resource) {
        logData.resource = {
          ...params.resource,
          id: params.resource.id 
            ? (typeof params.resource.id === 'string' 
                ? new mongoose.Types.ObjectId(params.resource.id)
                : params.resource.id)
            : undefined
        };
      }

      if (params.errorMessage) {
        logData.errorMessage = params.errorMessage;
      }

      if (params.aiMetadata) {
        logData.aiMetadata = params.aiMetadata;
      }

      if (params.apiMetadata) {
        logData.apiMetadata = params.apiMetadata;
      }

      if (params.exportMetadata) {
        logData.exportMetadata = params.exportMetadata;
      }

      if (params.paymentMetadata) {
        logData.paymentMetadata = params.paymentMetadata;
      }

      if (params.adminMetadata) {
        logData.adminMetadata = {
          ...params.adminMetadata,
          adminUserId: params.adminMetadata.adminUserId
            ? (typeof params.adminMetadata.adminUserId === 'string'
                ? new mongoose.Types.ObjectId(params.adminMetadata.adminUserId)
                : params.adminMetadata.adminUserId)
            : undefined,
          targetUserId: params.adminMetadata.targetUserId
            ? (typeof params.adminMetadata.targetUserId === 'string'
                ? new mongoose.Types.ObjectId(params.adminMetadata.targetUserId)
                : params.adminMetadata.targetUserId)
            : undefined
        };
      }

      if (params.metadata) {
        logData.metadata = params.metadata;
      }

      if (params.tags) {
        logData.tags = params.tags;
      }

      await ActivityLog.create(logData);

    } catch (error) {
      // Don't throw - logging should never break the application
      console.error('❌ Failed to log activity:', error);
    }
  }

  /**
   * Log API request
   */
  static async logAPI(params: {
    endpoint: string;
    method: string;
    userId?: string;
    userEmail?: string;
    statusCode: number;
    responseTime: number;
    ipAddress?: string;
    userAgent?: string;
    requestSize?: number;
    responseSize?: number;
    errorMessage?: string;
  }): Promise<void> {
    await this.log({
      logType: 'api',
      endpoint: params.endpoint,
      method: params.method,
      userId: params.userId,
      userEmail: params.userEmail,
      statusCode: params.statusCode,
      responseTime: params.responseTime,
      ipAddress: params.ipAddress,
      action: `${params.method} ${params.endpoint}`,
      status: params.statusCode >= 400 ? 'failed' : 'success',
      errorMessage: params.errorMessage,
      apiMetadata: {
        requestSize: params.requestSize,
        responseSize: params.responseSize,
        userAgent: params.userAgent,
        errorCode: params.statusCode >= 400 ? String(params.statusCode) : undefined
      },
      tags: ['api', params.method.toLowerCase()]
    });
  }

  /**
   * Log AI usage
   */
  static async logAI(params: {
    userId?: string;
    userEmail?: string;
    model: string;
    tokensUsed: number;
    cost: number;
    prompt?: string;
    responseLength?: number;
    resourceType?: string;
    resourceId?: string;
    action: string;
    status: LogStatus;
    errorMessage?: string;
    endpoint?: string;
  }): Promise<void> {
    let finalUserId = params.userId;
    let finalUserEmail = params.userEmail;

    // Attempt to get user from session if not provided
    if (!finalUserId) {
      try {
        const { getServerSession } = await import('next-auth');
        const { authOptions } = await import('@/lib/auth');
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
          finalUserId = session.user.id;
          finalUserEmail = session.user.email || finalUserEmail;
        }
      } catch (e) {
        // Ignore session errors
      }
    }

    await this.log({
      logType: 'ai',
      userId: finalUserId,
      userEmail: finalUserEmail,
      action: params.action,
      endpoint: params.endpoint,
      status: params.status,
      errorMessage: params.errorMessage,
      aiMetadata: {
        model: params.model,
        tokensUsed: params.tokensUsed,
        cost: params.cost,
        prompt: params.prompt,
        responseLength: params.responseLength
      },
      resource: params.resourceType && params.resourceId ? {
        type: params.resourceType as any,
        id: params.resourceId
      } : undefined,
      tags: ['ai', params.model]
    });
  }

  /**
   * Log user action
   */
  static async logUserAction(params: {
    userId: string;
    userEmail?: string;
    action: string;
    resourceType?: 'cv' | 'cover_letter' | 'job' | 'journey';
    resourceId?: string;
    resourceName?: string;
    status: LogStatus;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      logType: 'user_action',
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      status: params.status,
      ipAddress: params.ipAddress,
      resource: params.resourceType && params.resourceId ? {
        type: params.resourceType,
        id: params.resourceId,
        name: params.resourceName
      } : undefined,
      metadata: params.metadata,
      tags: ['user_action', params.resourceType || 'general']
    });
  }

  /**
   * Log admin action
   */
  static async logAdminAction(params: {
    adminUserId: string;
    adminEmail?: string;
    action: string;
    targetUserId?: string;
    actionType: string;
    resourceType?: string;
    resourceId?: string;
    status: LogStatus;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      logType: 'admin_action',
      action: params.action,
      status: params.status,
      adminMetadata: {
        adminUserId: params.adminUserId,
        adminEmail: params.adminEmail,
        targetUserId: params.targetUserId,
        actionType: params.actionType
      },
      resource: params.resourceType && params.resourceId ? {
        type: params.resourceType as any,
        id: params.resourceId
      } : undefined,
      metadata: params.metadata,
      tags: ['admin_action', params.actionType]
    });
  }

  /**
   * Log export
   */
  static async logExport(params: {
    userId: string;
    userEmail?: string;
    format: 'pdf' | 'docx' | 'txt';
    templateUsed?: string;
    fileSize: number;
    resourceType: 'cv' | 'cover_letter';
    resourceId: string;
    resourceName?: string;
    status: LogStatus;
    errorMessage?: string;
  }): Promise<void> {
    await this.log({
      logType: 'export',
      userId: params.userId,
      userEmail: params.userEmail,
      action: `export_${params.format}`,
      status: params.status,
      errorMessage: params.errorMessage,
      exportMetadata: {
        format: params.format,
        templateUsed: params.templateUsed,
        fileSize: params.fileSize
      },
      resource: {
        type: params.resourceType,
        id: params.resourceId,
        name: params.resourceName
      },
      tags: ['export', params.format]
    });
  }

  /**
   * Log credit usage
   */
  static async logCreditUsage(params: {
    userId: string;
    userEmail?: string;
    creditType: 'job_credit' | 'cv_credit' | 'export_credit' | 'ats_credit';
    creditsUsed: number;
    creditsRemaining: number;
    planKey: string;
    resourceType?: 'cv' | 'cover_letter' | 'job' | 'journey';
    resourceId?: string;
    status: LogStatus;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      logType: 'user_action',
      userId: params.userId,
      userEmail: params.userEmail,
      action: 'credit_used',
      status: params.status,
      ipAddress: params.ipAddress,
      resource: params.resourceType && params.resourceId ? {
        type: params.resourceType,
        id: params.resourceId
      } : undefined,
      metadata: {
        creditType: params.creditType,
        creditsUsed: params.creditsUsed,
        creditsRemaining: params.creditsRemaining,
        planKey: params.planKey,
        ...params.metadata
      },
      tags: ['credit_usage', params.creditType, params.planKey]
    });
  }

  /**
   * Log payment
   */
  static async logPayment(params: {
    userId: string;
    userEmail?: string;
    amount: number;
    currency: string;
    provider: 'stripe' | 'razorpay';
    transactionId: string;
    planKey: string;
    status: LogStatus;
    errorMessage?: string;
  }): Promise<void> {
    await this.log({
      logType: 'payment',
      userId: params.userId,
      userEmail: params.userEmail,
      action: 'payment_processed',
      status: params.status,
      errorMessage: params.errorMessage,
      paymentMetadata: {
        amount: params.amount,
        currency: params.currency,
        provider: params.provider,
        transactionId: params.transactionId,
        planKey: params.planKey
      },
      tags: ['payment', params.provider, params.planKey]
    });
  }

  /**
   * Get logs with filters
   */
  static async getLogs(filters: {
    logType?: LogType | LogType[];
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: LogStatus;
    action?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ logs: IActivityLog[]; total: number }> {
    try {
      await getConnection();

      const query: any = {};

      if (filters.logType) {
        if (Array.isArray(filters.logType)) {
          query.logType = { $in: filters.logType };
        } else {
          query.logType = filters.logType;
        }
      }

      if (filters.userId) {
        query.userId = new mongoose.Types.ObjectId(filters.userId);
      }

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) {
          query.timestamp.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.timestamp.$lte = filters.endDate;
        }
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.action) {
        query.action = { $regex: filters.action, $options: 'i' };
      }

      const [logs, total] = await Promise.all([
        ActivityLog.find(query)
          .sort({ timestamp: -1 })
          .limit(filters.limit || 100)
          .skip(filters.skip || 0)
          .lean(),
        ActivityLog.countDocuments(query)
      ]);

      return { logs: logs as IActivityLog[], total };
    } catch (error) {
      console.error('❌ Failed to get logs:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get metrics from logs
   */
  static async getMetrics(timeRange: 'today' | '7d' | '30d' | '90d'): Promise<{
    totalLogs: number;
    byType: Record<LogType, number>;
    byStatus: Record<LogStatus, number>;
    errorRate: number;
    avgResponseTime: number;
    totalAIUsage: {
      tokens: number;
      cost: number;
      requests: number;
    };
  }> {
    try {
      await getConnection();

      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const logs = await ActivityLog.find({
        timestamp: { $gte: startDate }
      }).lean();

      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      let totalResponseTime = 0;
      let responseTimeCount = 0;
      let totalTokens = 0;
      let totalCost = 0;
      let aiRequests = 0;

      logs.forEach(log => {
        byType[log.logType] = (byType[log.logType] || 0) + 1;
        byStatus[log.status] = (byStatus[log.status] || 0) + 1;

        if (log.responseTime) {
          totalResponseTime += log.responseTime;
          responseTimeCount++;
        }

        if (log.logType === 'ai' && log.aiMetadata) {
          totalTokens += log.aiMetadata.tokensUsed || 0;
          totalCost += log.aiMetadata.cost || 0;
          aiRequests++;
        }
      });

      const totalLogs = logs.length;
      const failedLogs = byStatus['failed'] || 0;
      const errorRate = totalLogs > 0 ? (failedLogs / totalLogs) * 100 : 0;
      const avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

      return {
        totalLogs,
        byType: byType as Record<LogType, number>,
        byStatus: byStatus as Record<LogStatus, number>,
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime),
        totalAIUsage: {
          tokens: totalTokens,
          cost: Math.round(totalCost * 10000) / 10000, // Round to 4 decimals
          requests: aiRequests
        }
      };
    } catch (error) {
      console.error('❌ Failed to get metrics:', error);
      return {
        totalLogs: 0,
        byType: {} as Record<LogType, number>,
        byStatus: {} as Record<LogStatus, number>,
        errorRate: 0,
        avgResponseTime: 0,
        totalAIUsage: { tokens: 0, cost: 0, requests: 0 }
      };
    }
  }
}

