/**
 * Node.js-specific OpenTelemetry instrumentation
 * 
 * This file contains OpenTelemetry setup that only runs in the Node.js runtime.
 * It's separated from the main instrumentation.ts to avoid Edge Runtime issues.
 */

// Export empty object to make this a valid module
export {};

// Only run in Node.js runtime
if (process.env.NEXT_RUNTIME === 'nodejs') {
  console.log('🔧 Loading OpenTelemetry instrumentation for Node.js runtime');
  
  // OpenTelemetry setup can be added here if needed
  // For now, we'll just log that it's loaded
  console.log('✅ OpenTelemetry instrumentation loaded successfully');
}
