/**
 * Next.js Instrumentation Hook
 * 
 * This file is automatically loaded by Next.js when instrumentation is enabled.
 * It runs in the Node.js runtime, not the Edge Runtime.
 * 
 * IMPORTANT: This file must be Edge-safe. Vercel's Edge bundler analyzes this file
 * even though it doesn't run in Edge Runtime, so we must avoid any static references.
 */

export async function register() {
  // Only run in Node.js runtime - check runtime environment first
  if (typeof process === 'undefined') {
    return;
  }

  const runtime = process.env.NEXT_RUNTIME;
  if (!runtime || runtime !== 'nodejs') {
    return;
  }

  // Dynamically import instrumentation setup using variable to prevent static analysis
  // The bundler cannot statically analyze variable-based imports
  try {
    // Build module path dynamically to prevent static analysis
    const basePath = './instrumentation';
    const ext = '.node';
    const fullPath = basePath + ext;
    
    // Use dynamic import with variable (not string literal) to prevent bundler analysis
    await import(fullPath);
  } catch {
    // Silently fail - instrumentation is optional
  }
}
