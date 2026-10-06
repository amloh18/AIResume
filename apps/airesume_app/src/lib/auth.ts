import { NextAuthOptions } from 'next-auth'
import { authConfig } from './auth-config'

/**
 * Legacy Auth Configuration - Updated to use the new unified authConfig
 * 
 * This file now re-exports the unified auth configuration from auth-config.ts
 * to maintain backward compatibility with existing API routes.
 * 
 * All new authentication should use authConfig directly.
 * 
 * @deprecated Use @/lib/auth-config instead
 */
export const authOptions: NextAuthOptions = authConfig

// Re-export everything from auth-config for convenience
export { authConfig }
export default authConfig