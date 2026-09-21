// @ts-nocheck
/**
 * Puppeteer Browser Pool Service
 * 
 * Manages a pool of Puppeteer browser instances to reduce startup overhead
 * Reuses browsers instead of launching new ones for each request
 */

import { BaseService } from './baseService';
import { configService } from './configService';
import { rendererHealthService } from './rendererHealthService';
import { getPuppeteerConnectOptions, getBrowserRuntime } from './browserService';

interface BrowserPoolEntry {
  browser: any;
  lastUsed: number;
  inUse: boolean;
  pageCount: number;
  /**
   * True when this browser is a CDP connection to the VPS-hosted Chrome rather than a process we own.
   *
   * The distinction is not cosmetic: Puppeteer's `close()` sends `Browser.close` over the wire, which
   * would shut down the *shared* remote browser for every other in-flight request. Remote entries must
   * be detached with `disconnect()`, which only drops our connection.
   */
  remote: boolean;
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
      // Try to find an available browser. Remote connections are pooled exactly like local ones:
      // `poolSize` (default 3) is the concurrency limit for the shared VPS Chrome, and each render gets
      // its own page, so reusing the connection is both cheaper and the existing contract.
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

      // Prefer the VPS-hosted browser. `browserService` decides which endpoint applies and, in
      // production with nothing configured, tells us so instead of letting `launch()` fail on a
      // missing Chromium binary — the slim image has no browser to find.
      const connectOptions = await getPuppeteerConnectOptions();
      const runtime = getBrowserRuntime();

      let browser: any;
      let remote: boolean;

      if (connectOptions) {
        console.log(`[PuppeteerPool] connecting to the remote Chrome over CDP (${runtime.endpoint})`);
        browser = await puppeteer.connect(connectOptions);
        remote = true;
      } else if (runtime.mode === 'unavailable') {
        throw new Error(runtime.reason);
      } else {
        console.log('[PuppeteerPool] launching a local Chromium (development fallback)');
        browser = await puppeteer.launch({
          headless: config.headless,
          args: config.args
        });
        remote = false;
      }

      const entry: BrowserPoolEntry = {
        browser,
        lastUsed: Date.now(),
        inUse: false,
        pageCount: 0,
        remote
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
      const entry = this.pool[index];
      try {
        // `close()` on a CDP connection kills the shared remote browser; detach instead.
        if (entry.remote && typeof entry.browser.disconnect === 'function') {
          await entry.browser.disconnect();
        } else {
          await entry.browser.close();
        }
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
        const teardown = entry.remote && typeof entry.browser.disconnect === 'function'
          ? entry.browser.disconnect()
          : entry.browser.close();
        return Promise.resolve(teardown).catch(() => {
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

