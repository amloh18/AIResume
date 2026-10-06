import { PortalAdapter } from './types';
import { PortalProvider } from '@/models/PortalConnection';
import { NaukriAdapter } from './adapters/NaukriAdapter';
import { IndeedAdapter } from './adapters/IndeedAdapter';
import { LinkedInAdapter } from './adapters/LinkedInAdapter';
import { DirectAtsAdapter } from './adapters/DirectAtsAdapter';

class PortalAdapterRegistry {
  private adapters: Map<PortalProvider, PortalAdapter> = new Map();

  constructor() {
    this.register(new NaukriAdapter());
    this.register(new IndeedAdapter());
    this.register(new LinkedInAdapter());
    this.register(new DirectAtsAdapter('greenhouse'));
    this.register(new DirectAtsAdapter('lever'));
    this.register(new DirectAtsAdapter('ashby'));
    this.register(new DirectAtsAdapter('workable'));
    this.register(new DirectAtsAdapter('adzuna'));
  }

  register(adapter: PortalAdapter) {
    this.adapters.set(adapter.provider, adapter);
  }

  getAdapter(provider: PortalProvider): PortalAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      // Fallback to direct adapter for any other public portal
      const fallback = new DirectAtsAdapter(provider);
      this.adapters.set(provider, fallback);
      return fallback;
    }
    return adapter;
  }

  getAllSupportedProviders(): PortalProvider[] {
    return Array.from(this.adapters.keys());
  }
}

export const portalAdapterRegistry = new PortalAdapterRegistry();
export default portalAdapterRegistry;
