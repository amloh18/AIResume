import { decryptToken, encryptToken } from '@/lib/auth/token-encryption';

/**
 * LinkedIn Token Refresh Service
 * 
 * Note: LinkedIn OAuth 2.0 implementation typically doesn't provide
 * refresh tokens for most integrations. This service handles token
 * validation and provides guidance for re-authentication when needed.
 */
export class LinkedInTokenRefreshService {
  private static readonly TOKEN_EXPIRY_BUFFER = 300; // 5 minutes in seconds

  /**
   * Check if a token is expired or near expiry
   * @param expiresIn - Time until expiry in seconds
   * @returns true if token needs refresh
   */
  static isTokenExpired(expiresIn?: number): boolean {
    if (!expiresIn || expiresIn <= 0) return true;
    return expiresIn <= this.TOKEN_EXPIRY_BUFFER;
  }

  /**
   * Check if a token is valid (not expired)
   * @param expiresIn - Time until expiry in seconds
   * @returns true if token is still valid
   */
  static isTokenValid(expiresIn?: number): boolean {
    return !this.isTokenExpired(expiresIn);
  }

  /**
   * Get token expiry date
   * @param expiresIn - Time until expiry in seconds
   * @returns Date object or null if not available
   */
  static getExpiryDate(expiresIn?: number): Date | null {
    if (!expiresIn || expiresIn <= 0) return null;
    return new Date(Date.now() + expiresIn * 1000);
  }

  /**
   * Get time until expiry in human-readable format
   * @param expiresIn - Time until expiry in seconds
   * @returns Human-readable string
   */
  static getTimeUntilExpiry(expiresIn?: number): string {
    if (!expiresIn || expiresIn <= 0) return 'Expired';
    
    const hours = Math.floor(expiresIn / 3600);
    const minutes = Math.floor((expiresIn % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Attempt to refresh an expired LinkedIn token
   * Note: LinkedIn typically requires re-authentication
   * @param refreshToken - Refresh token (if available)
   * @returns New access token or null if refresh failed
   */
  static async refreshToken(refreshToken?: string): Promise<string | null> {
    if (!refreshToken) {
      console.warn('No refresh token available for LinkedIn');
      return null;
    }

    try {
      // LinkedIn OAuth 2.0 token refresh endpoint
      // Note: This may not work for all LinkedIn API integrations
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID || '',
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
        }),
      });

      if (!response.ok) {
        console.error('LinkedIn token refresh failed:', response.status);
        return null;
      }

      const data = await response.json();
      return data.access_token || null;
    } catch (error) {
      console.error('Error refreshing LinkedIn token:', error);
      return null;
    }
  }

  /**
   * Validate and decrypt stored token
   * @param encryptedToken - Encrypted token from JWT
   * @returns Decrypted token or null if invalid
   */
  static validateAndDecryptToken(encryptedToken?: string): string | null {
    if (!encryptedToken) {
      return null;
    }

    try {
      const decrypted = decryptToken(encryptedToken);
      
      // Basic validation - token should not be empty
      if (!decrypted || decrypted.length < 10) {
        console.warn('Decrypted token appears invalid');
        return null;
      }

      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt LinkedIn token:', error);
      return null;
    }
  }

  /**
   * Encrypt and store a new token
   * @param token - Plaintext token to encrypt
   * @returns Encrypted token
   */
  static encryptAndStoreToken(token: string): string {
    return encryptToken(token);
  }

  /**
   * Get re-authentication URL for LinkedIn
   * @param redirectUri - Where to redirect after auth
   * @returns OAuth URL
   */
  static getReauthUrl(redirectUri?: string): string {
    const baseUrl = 'https://www.linkedin.com/oauth/v2/authorization';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      redirect_uri: redirectUri || process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/linkedin',
      scope: 'r_liteprofile r_emailaddress w_member_social',
      state: `reauth_${Date.now()}`,
    });

    return `${baseUrl}?${params.toString()}`;
  }
}

/**
 * Middleware to check token validity before API calls
 */
export const withLinkedInTokenValidation = async (
  session: any,
  callback: (token: string) => Promise<any>
): Promise<any> => {
  const encryptedToken = session?.user?.linkedInAccessToken;
  const expiresIn = session?.user?.linkedInTokenExpiresIn;

  // Check if token exists
  if (!encryptedToken) {
    throw new Error('LinkedIn token not found. Please connect your LinkedIn account.');
  }

  // Check if token is expired
  if (LinkedInTokenRefreshService.isTokenExpired(expiresIn)) {
    throw new Error('LinkedIn token expired. Please reconnect your LinkedIn account.');
  }

  // Decrypt token
  const token = LinkedInTokenRefreshService.validateAndDecryptToken(encryptedToken);
  if (!token) {
    throw new Error('Invalid LinkedIn token. Please reconnect your LinkedIn account.');
  }

  // Execute callback with valid token
  return callback(token);
};
