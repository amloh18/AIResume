import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (256 bits) for AES-256-GCM
 */
const getEncryptionKey = (): Buffer => {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'cvcircle-secure-default-encryption-salt-2026';
  
  if (process.env.TOKEN_ENCRYPTION_KEY && process.env.TOKEN_ENCRYPTION_KEY.length === 64) {
    try {
      const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY, 'hex');
      if (key.length === 32) return key;
    } catch {
      // fallback to sha256
    }
  }

  // Derive stable 32-byte key via SHA-256
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt a token using AES-256-GCM
 * Returns base64-encoded string containing IV + auth tag + encrypted data
 */
export const encryptToken = (token: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    const combined = Buffer.concat([iv, tag, encrypted]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Token encryption error:', error);
    throw new Error('Failed to encrypt token');
  }
};

/**
 * Decrypt a token encrypted with encryptToken
 */
export const decryptToken = (encrypted: string): string => {
  try {
    const key = getEncryptionKey();
    const data = Buffer.from(encrypted, 'base64');
    
    // Extract IV, tag, and encrypted data
    const iv = data.slice(0, IV_LENGTH);
    const tag = data.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encryptedText = data.slice(IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Token decryption error:', error);
    throw new Error('Failed to decrypt token - token may be invalid or corrupted');
  }
};

/**
 * Check if a token needs to be refreshed (within 5 minutes of expiry)
 * Note: LinkedIn tokens typically expire after a certain period
 * This is a helper function for token refresh logic
 */
export const isTokenNearExpiry = (expiresIn: number | undefined, bufferSeconds: number = 300): boolean => {
  if (!expiresIn || expiresIn <= 0) return true;
  return expiresIn <= bufferSeconds;
};
