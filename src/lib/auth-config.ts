/**
 * Unified NextAuth Configuration
 * 
 * This file uses UnifiedAuthService for all authentication operations.
 * The UnifiedAuthService provides:
 * - Minimal JWT payload (only id, email) to prevent 431 errors
 * - Redis caching for user data (5-minute TTL)
 * - Fresh data fetch on each session check
 * - No localStorage usage (security improvement)
 * - HTTP-only cookies exclusively
 */

import { UnifiedAuthService } from './auth/unified-auth-service';

// Export NextAuth configuration from UnifiedAuthService
export const authConfig = UnifiedAuthService.getAuthConfig();

export default authConfig;
