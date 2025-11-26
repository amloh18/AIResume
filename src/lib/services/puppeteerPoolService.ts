/**
 * Puppeteer Browser Pool Service
 * 
 * Manages a pool of Puppeteer browser instances to reduce startup overhead
 * Reuses browsers instead of launching new ones for each request
 */

import { BaseService } from './baseService';
import { configService } from './configService';
import { rendererHealthService } from './rendererHealthService';

interface BrowserPoolEntry {
  browser: any;
  lastUsed: number;
  inUse: boolean;
  pageCount: number;
}

export class PuppeteerPoolService extends BaseService {
  private static instance: PuppeteerPoolService;
  private pool: BrowserPoolEntry[] = [];
  private poolSize: number;
  private idleTimeout: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super('PuppeteerPoolService');
    const config = configService.getPDFConfig().puppeteer;
    this.poolSize = config.poolSize;
    this.idleTimeout = config.idleTimeout;
    this.startCleanupTimer();
  }

  static getInstance(): PuppeteerPoolService {
    if (!PuppeteerPoolService.instance) {
      PuppeteerPoolService.instance = new PuppeteerPoolService();
    }
    return PuppeteerPoolService.instance;
  }

  /**
   * Get a browser from the pool
   */
  async getBrowser(): Promise<any> {
    return this.timeOperation('getBrowser', async () => {
      // Try to find an available browser
      let entry = this.pool.find(e => !e.inUse && e.browser && e.browser.isConnected());

      if (!entry) {
        // Check if we can create a new browser
        if (this.pool.length < this.poolSize) {
          entry = await this.createBrowser();
        } else {
          // Wait for a browser to become available
          entry = await this.waitForAvailableBrowser();
        }
      }

      if (!entry) {
        throw new Error('Failed to get browser from pool');
      }

      entry.inUse = true;
      entry.lastUsed = Date.now();
      entry.pageCount++;

      return entry.browser;
    });
  }

  /**
   * Release a browser back to the pool
   */
  async releaseBrowser(browser: any): Promise<void> {
    const entry = this.pool.find(e => e.browser === browser);
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = Date.now();
    }
  }

  /**
   * Create a new browser instance
   */
  private async createBrowser(): Promise<BrowserPoolEntry> {
    const config = configService.getPDFConfig().puppeteer;
    
    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.launch({
        headless: config.headless,
        args: config.args
      });

      const entry: BrowserPoolEntry = {
        browser,
        lastUsed: Date.now(),
        inUse: false,
        pageCount: 0
      };

      this.pool.push(entry);

      // Monitor browser for disconnection
      browser.on('disconnected', () => {
        this.removeBrowser(browser);
      });

      return entry;
    } catch (error) {
      throw this.handleError(error, { operation: 'createBrowser' });
    }
  }

  /**
   * Wait for an available browser
   */
  private async waitForAvailableBrowser(maxWait: number = 10000): Promise<BrowserPoolEntry | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const entry = this.pool.find(e => !e.inUse && e.browser && e.browser.isConnected());
      if (entry) {
        return entry;
      }
      await this.sleep(100); // Wait 100ms before checking again
    }

    return null;
  }

  /**
   * Remove a browser from the pool
   */
  private async removeBrowser(browser: any): Promise<void> {
    const index = this.pool.findIndex(e => e.browser === browser);
    if (index !== -1) {
      try {
        await this.pool[index].browser.close();
      } catch (error) {
        // Browser might already be closed
      }
      this.pool.splice(index, 1);
    }
  }

  /**
   * Warm up the pool with initial browsers
   */
  async warmupPool(size?: number): Promise<void> {
    const targetSize = size || Math.min(2, this.poolSize);
    const currentSize = this.pool.length;

    if (currentSize >= targetSize) {
      return;
    }

    const promises: Promise<void>[] = [];
    for (let i = currentSize; i < targetSize; i++) {
      promises.push(
        this.createBrowser().then(() => {
          // Browser created successfully
        }).catch(error => {
          // Log but don't fail warmup
          console.warn('Failed to create browser during warmup:', error);
        })
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    total: number;
    available: number;
    inUse: number;
    averagePageCount: number;
  } {
    const total = this.pool.length;
    const available = this.pool.filter(e => !e.inUse && e.browser && e.browser.isConnected()).length;
    const inUse = this.pool.filter(e => e.inUse).length;
    const averagePageCount = this.pool.length > 0
      ? this.pool.reduce((sum, e) => sum + e.pageCount, 0) / this.pool.length
      : 0;

    return {
      total,
      available,
      inUse,
      averagePageCount: Math.round(averagePageCount)
    };
  }

  /**
   * Clean up idle browsers
   */
  private startCleanupTimer(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleBrowsers().catch(error => {
        console.error('Error cleaning up idle browsers:', error);
      });
    }, 300000); // 5 minutes
  }

  /**
   * Remove idle browsers that haven't been used
   */
  private async cleanupIdleBrowsers(): Promise<void> {
    const now = Date.now();
    const browsersToRemove: any[] = [];

    for (const entry of this.pool) {
      if (!entry.inUse && (now - entry.lastUsed) > this.idleTimeout) {
        browsersToRemove.push(entry.browser);
      }
    }

    // Keep at least one browser in the pool
    if (browsersToRemove.length > 0 && this.pool.length - browsersToRemove.length >= 1) {
      for (const browser of browsersToRemove) {
        await this.removeBrowser(browser);
      }
    }
  }

  /**
   * Close all browsers and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    const closePromises = this.pool.map(entry => {
      if (entry.browser && entry.browser.isConnected()) {
        return entry.browser.close().catch(() => {
          // Ignore errors during shutdown
        });
      }
      return Promise.resolve();
    });

    await Promise.allSettled(closePromises);
    this.pool = [];
  }
}

export const puppeteerPoolService = PuppeteerPoolService.getInstance();

