/**
 * Next.js Instrumentation Hook
 * 
 * This file is automatically loaded by Next.js when instrumentation is enabled.
 * It runs in the Node.js runtime, not the Edge Runtime.
 */

export async function register() {
  // Only run in Node.js runtime (not Edge Runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import OpenTelemetry setup to avoid Edge Runtime issues
    try {
      await import('./instrumentation.node');
    } catch (error) {
      console.warn('Failed to load OpenTelemetry instrumentation:', error);
    }
  }
}
