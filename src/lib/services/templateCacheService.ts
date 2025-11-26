/**
 * Template Cache Service
 * 
 * Caches template data to reduce database queries
 * Uses CacheManager (Redis + in-memory fallback)
 */

import { cacheManager } from '@/lib/cache/cache-manager';
import { configService } from './configService';
import { ITemplate } from '@/types/template';
import { HARDCODED_TEMPLATES } from '@/lib/templates/hardcoded-templates';
import { Template } from '@/models';
import mongoose from 'mongoose';

export class TemplateCacheService {
  private static readonly CACHE_PREFIX = 'template:';
  private static readonly HARDCODED_PREFIX = 'template:hardcoded:';

  /**
   * Get template from cache or database
   */
  static async getTemplate(templateId: string): Promise<ITemplate | null> {
    const config = configService.getTemplateConfig();
    const cacheKey = `${this.CACHE_PREFIX}${templateId}`;

    try {
      // Check cache first
      const cached = await cacheManager.get<ITemplate>(cacheKey);
      if (cached) {
        return cached;
      }

      // Check hardcoded templates first
      const hardcodedTemplate = HARDCODED_TEMPLATES.find(
        t => t.id === templateId || t._id === templateId
      );

      if (hardcodedTemplate) {
        // Cache hardcoded template
        await cacheManager.set(
          `${this.HARDCODED_PREFIX}${templateId}`,
          hardcodedTemplate,
          config.cache.ttl
        );
        return hardcodedTemplate;
      }

      // Try database if templateId is valid ObjectId
      if (mongoose.Types.ObjectId.isValid(templateId)) {
        const template = await Template.findById(templateId);
        if (template) {
          const templateData = template.toObject() as ITemplate;
          // Cache database template
          await cacheManager.set(cacheKey, templateData, config.cache.ttl);
          return templateData;
        }
      }

      return null;
    } catch (error) {
      console.error('Template cache get error:', error);
      // Fallback to direct database query
      if (mongoose.Types.ObjectId.isValid(templateId)) {
        const template = await Template.findById(templateId);
        return template ? (template.toObject() as ITemplate) : null;
      }
      return null;
    }
  }

  /**
   * Preload popular templates
   */
  static async preloadTemplates(templateIds: string[]): Promise<void> {
    const config = configService.getTemplateConfig();
    const count = Math.min(templateIds.length, config.cache.preloadCount);

    const preloadPromises = templateIds.slice(0, count).map(id => 
      this.getTemplate(id).catch(() => null)
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Invalidate template cache
   */
  static async invalidateTemplate(templateId: string): Promise<void> {
    try {
      await cacheManager.delete(`${this.CACHE_PREFIX}${templateId}`);
      await cacheManager.delete(`${this.HARDCODED_PREFIX}${templateId}`);
    } catch (error) {
      console.error('Template cache invalidate error:', error);
    }
  }

  /**
   * Clear all template cache
   */
  static async clear(): Promise<void> {
    try {
      await cacheManager.invalidate(`${this.CACHE_PREFIX}*`);
      await cacheManager.invalidate(`${this.HARDCODED_PREFIX}*`);
    } catch (error) {
      console.error('Template cache clear error:', error);
    }
  }
}

export const templateCacheService = TemplateCacheService;

