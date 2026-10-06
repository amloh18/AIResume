// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
/**
 * PDF Cache Service
 * 
 * Provides caching for generated PDFs to improve performance
 * Uses CacheManager (Redis + in-memory fallback) for distributed caching
 */

import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { cacheManager } from '@/lib/cache/cache-manager';
import { configService } from './configService';
import { ActivityLogService } from './activityLogService';
import crypto from 'crypto';

interface CacheMetadata {
  timestamp: number;
  fileSize: number;
  format: string;
}

export class PDFCacheService {
  private static readonly CACHE_PREFIX = 'pdf:';
  private static readonly DEFAULT_TTL = 3600; // 1 hour in seconds
  private static cacheHits = 0;
  private static cacheMisses = 0;

  /**
   * Generate cache key from CV data, template, and options
   */
  static generateCacheKey(
    cvData: UnifiedCVDataStructure,
    template: ITemplate,
    paperSize: string,
    format: string
  ): string {
    // Create hash of relevant data
    const dataToHash = JSON.stringify({
      cvData: cvData,
      templateId: template?.id || template?._id,
      templateVersion: template?.version || 1,
      paperSize,
      format
    });

    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Get cached PDF if available and valid
   */
  static async get(cacheKey: string): Promise<Blob | null> {
    try {
      // Get cached data from CacheManager (Redis or in-memory)
      const cached = await cacheManager.get<{ buffer: number[]; metadata: CacheMetadata }>(cacheKey);
      
      if (!cached) {
        this.cacheMisses++;
        return null;
      }

      // Convert buffer array back to Blob
      const buffer = Buffer.from(cached.buffer);
      const blob = new Blob([buffer], { type: 'application/pdf' });

      // Log cache hit
      this.cacheHits++;
      this.logCacheHit(cacheKey, cached.metadata);

      return blob;
    } catch (error) {
      console.error('PDF cache get error:', error);
      this.cacheMisses++;
      return null;
    }
  }

  /**
   * Set cached PDF
   */
  static async set(cacheKey: string, blob: Blob, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      // Convert Blob to buffer for storage
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Store with metadata
      const cacheData = {
        buffer: Array.from(buffer),
        metadata: {
          timestamp: Date.now(),
          fileSize: blob.size,
          format: 'pdf'
        }
      };

      // Use CacheManager to store (Redis or in-memory)
      await cacheManager.set(cacheKey, cacheData, ttl);

      // Log cache set
      this.logCacheSet(cacheKey, blob.size);
    } catch (error) {
      console.error('PDF cache set error:', error);
      // Don't throw - caching failures shouldn't break downloads
    }
  }

  /**
   * Invalidate cache for a specific CV
   */
  static async invalidateCV(cvId: string): Promise<void> {
    try {
      // Invalidate all PDFs for this CV
      const pattern = `${this.CACHE_PREFIX}*`;
      await cacheManager.invalidate(pattern);
    } catch (error) {
      console.error('PDF cache invalidate error:', error);
    }
  }

  /**
   * Clear all PDF cache
   */
  static async clear(): Promise<void> {
    try {
      await cacheManager.invalidate(`${this.CACHE_PREFIX}*`);
      this.cacheHits = 0;
      this.cacheMisses = 0;
    } catch (error) {
      console.error('PDF cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Log cache hit for analytics
   */
  private static async logCacheHit(cacheKey: string, metadata: CacheMetadata): Promise<void> {
    try {
      await ActivityLogService.log({
        logType: 'performance',
        action: 'pdf_cache_hit',
        status: 'success',
        metadata: {
          cacheKey,
          fileSize: metadata.fileSize,
          format: metadata.format,
          age: Date.now() - metadata.timestamp
        }
      });
    } catch (error) {
      // Don't fail if logging fails
    }
  }

  /**
   * Log cache set for analytics
   */
  private static async logCacheSet(cacheKey: string, fileSize: number): Promise<void> {
    try {
      await ActivityLogService.log({
        logType: 'performance',
        action: 'pdf_cache_set',
        status: 'success',
        metadata: {
          cacheKey,
          fileSize
        }
      });
    } catch (error) {
      // Don't fail if logging fails
    }
  }
}

export const pdfCacheService = PDFCacheService;

