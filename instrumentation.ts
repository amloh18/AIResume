/**
 * Next.js Instrumentation Hook
 * 
 * This file is automatically loaded by Next.js when instrumentation is enabled.
 * It runs in the Node.js runtime, not the Edge Runtime.
 * 
 * IMPORTANT: This file must never import OpenTelemetry at the top level to avoid
 * Edge Runtime bundling issues on Vercel.
 */

export async function register() {
  // Only run in Node.js runtime (not Edge Runtime)
  // Check we're in Node.js runtime and not Edge Runtime
  if (
    typeof process === 'undefined' || 
    !process.env.NEXT_RUNTIME ||
    process.env.NEXT_RUNTIME !== 'nodejs'
  ) {
    // Skip instrumentation in Edge Runtime or when runtime is ambiguous
    return;
  }

  // Dynamically import OpenTelemetry setup to avoid Edge Runtime issues
  // This import happens at runtime, not build time, so it won't be bundled for Edge
  try {
    // Use dynamic import with string literal to prevent static analysis
    const instrumentationPath = './instrumentation.node';
    await import(instrumentationPath);
  } catch (error) {
    // Silently fail if OpenTelemetry is not available (e.g., in Edge Runtime)
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to load OpenTelemetry instrumentation:', error);
    }
  }
}
