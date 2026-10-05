import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('LinkedIn Source Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('getLinkedInEnabled (via getSourceEnabled)', () => {
    it('returns true when LINKEDIN_ENABLED=true env var is set', async () => {
      vi.stubEnv('LINKEDIN_ENABLED', 'true');
      const { getSourceEnabled } = await import('@/lib/ingestion/engine');
      expect(getSourceEnabled('linkedin')).toBe(true);
    });

    it('returns false when LINKEDIN_ENABLED=false env var is set', async () => {
      vi.stubEnv('LINKEDIN_ENABLED', 'false');
      const { getSourceEnabled } = await import('@/lib/ingestion/engine');
      expect(getSourceEnabled('linkedin')).toBe(false);
    });

    it('returns false when LINKEDIN_ENABLED is not set', async () => {
      vi.unstubAllEnvs();
      const { getSourceEnabled } = await import('@/lib/ingestion/engine');
      // Default: no env var, no DB settings, SOURCE_REGISTRY has enabled: false
      expect(getSourceEnabled('linkedin')).toBe(false);
    });

    it('env var takes precedence over SOURCE_REGISTRY default', async () => {
      vi.stubEnv('LINKEDIN_ENABLED', 'true');
      const { getSourceEnabled, SOURCE_REGISTRY } = await import('@/lib/ingestion/engine');
      // SOURCE_REGISTRY.linkedin.enabled is false, but env var overrides
      expect(SOURCE_REGISTRY.linkedin.enabled).toBe(false);
      expect(getSourceEnabled('linkedin')).toBe(true);
    });
  });

  describe('checkSourceConfig for LinkedIn', () => {
    it('returns ready:false when LinkedIn is disabled', async () => {
      vi.unstubAllEnvs();
      const { checkSourceConfig } = await import('@/lib/ingestion/engine');
      const result = checkSourceConfig('linkedin');
      expect(result.ready).toBe(false);
      expect(result.reason).toContain('disabled');
    });

    it('returns ready:true when enabled and worker script exists', async () => {
      vi.stubEnv('LINKEDIN_ENABLED', 'true');
      const fs = await import('fs');
      // Mock fs.accessSync to succeed
      vi.spyOn(fs.default, 'accessSync').mockImplementation(() => {});
      const { checkSourceConfig } = await import('@/lib/ingestion/engine');
      const result = checkSourceConfig('linkedin');
      expect(result.ready).toBe(true);
      vi.mocked(fs.default.accessSync).mockRestore();
    });

    it('returns ready:false when enabled but worker script missing', async () => {
      vi.stubEnv('LINKEDIN_ENABLED', 'true');
      const fs = await import('fs');
      vi.spyOn(fs.default, 'accessSync').mockImplementation(() => {
        throw new Error('ENOENT');
      });
      const { checkSourceConfig } = await import('@/lib/ingestion/engine');
      const result = checkSourceConfig('linkedin');
      expect(result.ready).toBe(false);
      expect(result.reason).toContain('not found');
      vi.mocked(fs.default.accessSync).mockRestore();
    });
  });

  describe('SOURCE_REGISTRY LinkedIn entry', () => {
    it('has correct type and properties', async () => {
      const { SOURCE_REGISTRY } = await import('@/lib/ingestion/engine');
      const linkedin = SOURCE_REGISTRY.linkedin;
      expect(linkedin).toBeDefined();
      expect(linkedin.id).toBe('linkedin');
      expect(linkedin.type).toBe('browser_worker');
      expect(linkedin.maxResults).toBe(500);
      expect(linkedin.maxDurationMs).toBe(15 * 60 * 1000);
      expect(linkedin.refreshIntervalMs).toBe(12 * 60 * 60 * 1000);
    });
  });

  describe('Other sources unaffected by LinkedIn changes', () => {
    it('getSourceEnabled for greenhouse uses registry default', async () => {
      vi.unstubAllEnvs();
      const { getSourceEnabled } = await import('@/lib/ingestion/engine');
      expect(getSourceEnabled('greenhouse')).toBe(true);
    });

    it('getSourceEnabled for unknown source returns false', async () => {
      vi.unstubAllEnvs();
      const { getSourceEnabled } = await import('@/lib/ingestion/engine');
      expect(getSourceEnabled('nonexistent')).toBe(false);
    });
  });
});
