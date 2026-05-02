// @ts-nocheck
/**
 * Download Analytics Service
 * 
 * Tracks download events for analytics and admin reporting
 */

import { ActivityLogService } from './activityLogService';
import ActivityLog from '@/models/ActivityLog';
import { getConnection } from '@/lib/database';
import mongoose from 'mongoose';
import { BaseService } from './baseService';
import { logger } from '@/lib/structured-logger';

export interface DownloadLog {
  userId: string;
  cvId?: string;
  coverLetterId?: string;
  format: 'pdf' | 'docx' | 'doc';
  paperSize?: 'A4' | 'Letter';
  templateId?: string;
  fileSize: number;
  success: boolean;
  error?: string;
}

export class DownloadAnalyticsService extends BaseService {
  private static instance: DownloadAnalyticsService;

  private constructor() {
    super('DownloadAnalyticsService');
  }

  static getInstance(): DownloadAnalyticsService {
    if (!DownloadAnalyticsService.instance) {
      DownloadAnalyticsService.instance = new DownloadAnalyticsService();
    }
    return DownloadAnalyticsService.instance;
  }

  /**
   * Log a download event
   */
  static async logDownload(log: DownloadLog): Promise<void> {
    const instance = DownloadAnalyticsService.getInstance();
    return instance.logDownloadInternal(log);
  }

  private async logDownloadInternal(log: DownloadLog): Promise<void> {
    try {
      await ActivityLogService.logExport({
        userId: log.userId,
        userEmail: '', // Will be fetched if needed
        format: log.format,
        fileSize: log.fileSize,
        resourceType: log.cvId ? 'cv' : 'cover_letter',
        resourceId: log.cvId || log.coverLetterId || 'unknown',
        resourceName: log.cvId ? 'CV' : 'Cover Letter',
        status: log.success ? 'success' : 'error',
        templateUsed: log.templateId,
        errorMessage: log.error
      });

      // Log business event
      await this.logBusinessEvent('download', {
        format: log.format,
        paperSize: log.paperSize,
        templateId: log.templateId,
        fileSize: log.fileSize,
        success: log.success,
        resourceType: log.cvId ? 'cv' : 'coverLetter',
        resourceId: log.cvId || log.coverLetterId
      }, log.userId);
    } catch (error) {
      logger.error(`${this.serviceName}: Failed to log download analytics`, error instanceof Error ? error : new Error(String(error)), {
        userId: log.userId,
        format: log.format
      });
      // Don't throw - analytics failures shouldn't break downloads
    }
  }

  /**
   * Get download statistics (for admin dashboard)
   */
  static async getDownloadStats(options: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    format?: 'pdf' | 'docx' | 'doc';
  } = {}): Promise<{
    totalDownloads: number;
    downloadsByFormat: Record<string, number>;
    downloadsByTemplate: Record<string, number>;
    averageFileSize: number;
  }> {
    const instance = DownloadAnalyticsService.getInstance();
    return instance.getDownloadStatsInternal(options);
  }

  private async getDownloadStatsInternal(options: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    format?: 'pdf' | 'docx' | 'doc';
  } = {}): Promise<{
    totalDownloads: number;
    downloadsByFormat: Record<string, number>;
    downloadsByTemplate: Record<string, number>;
    averageFileSize: number;
  }> {
    return this.timeOperation('getDownloadStats', async () => {
      try {
        await getConnection();

        // Build query
        const query: any = {
          logType: 'export',
          status: 'success'
        };

        if (options.userId) {
          query.userId = new mongoose.Types.ObjectId(options.userId);
        }

        if (options.startDate || options.endDate) {
          query.timestamp = {};
          if (options.startDate) {
            query.timestamp.$gte = options.startDate;
          }
          if (options.endDate) {
            query.timestamp.$lte = options.endDate;
          }
        }

        // Fetch all export logs
        const logs = await ActivityLog.find(query).lean();

        // Filter by format if specified
        let filteredLogs = logs;
        if (options.format) {
          filteredLogs = logs.filter(log => 
            log.exportMetadata?.format === options.format
          );
        }

        // Calculate statistics
        const totalDownloads = filteredLogs.length;
        const downloadsByFormat: Record<string, number> = {};
        const downloadsByTemplate: Record<string, number> = {};
        let totalFileSize = 0;
        let fileSizeCount = 0;

        filteredLogs.forEach(log => {
          // Count by format
          const format = log.exportMetadata?.format || 'unknown';
          downloadsByFormat[format] = (downloadsByFormat[format] || 0) + 1;

          // Count by template
          const templateId = log.exportMetadata?.templateUsed || 'unknown';
          downloadsByTemplate[templateId] = (downloadsByTemplate[templateId] || 0) + 1;

          // Calculate average file size
          if (log.exportMetadata?.fileSize) {
            totalFileSize += log.exportMetadata.fileSize;
            fileSizeCount++;
          }
        });

        const averageFileSize = fileSizeCount > 0 ? totalFileSize / fileSizeCount : 0;

        return {
          totalDownloads,
          downloadsByFormat,
          downloadsByTemplate,
          averageFileSize: Math.round(averageFileSize)
        };
      } catch (error) {
        logger.error(`${this.serviceName}: Failed to get download stats`, error instanceof Error ? error : new Error(String(error)), options);
        // Return empty stats on error
        return {
          totalDownloads: 0,
          downloadsByFormat: {},
          downloadsByTemplate: {},
          averageFileSize: 0
        };
      }
    });
  }
}

export const downloadAnalyticsService = DownloadAnalyticsService;

