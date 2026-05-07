import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { encryptToken, decryptToken, isTokenNearExpiry } from '@/lib/auth/token-encryption';

// Mock environment variable
const originalEnv = process.env.TOKEN_ENCRYPTION_KEY;

beforeEach(() => {
  // Use a valid 32-byte hex key for testing
  process.env.TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

afterAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = originalEnv;
});

describe('Token Encryption', () => {
  it('should encrypt and decrypt a token correctly', () => {
    const originalToken = 'test-access-token-12345';
    
    const encrypted = encryptToken(originalToken);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalToken);
    expect(typeof encrypted).toBe('string');
    
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it('should encrypt different tokens to different values', () => {
    const token1 = encryptToken('token-1');
    const token2 = encryptToken('token-2');
    
    expect(token1).not.toBe(token2);
  });

  it('should handle long tokens', () => {
    const longToken = 'a'.repeat(1000);
    const encrypted = encryptToken(longToken);
    const decrypted = decryptToken(encrypted);
    
    expect(decrypted).toBe(longToken);
  });

  it('should handle empty token', () => {
    const encrypted = encryptToken('');
    const decrypted = decryptToken(encrypted);
    
    expect(decrypted).toBe('');
  });

  it('should throw error for invalid encrypted token', () => {
    expect(() => decryptToken('invalid-base64')).toThrow();
  });

  it('should throw error for tampered token', () => {
    const encrypted = encryptToken('test-token');
    // Tamper with the token by changing a character in the middle
    const tampered = encrypted.substring(0, 10) + 'X' + encrypted.substring(11);
    
    expect(() => decryptToken(tampered)).toThrow('Failed to decrypt token');
  });
});

describe('Token Expiry Check', () => {
  it('should detect expired token', () => {
    expect(isTokenNearExpiry(0)).toBe(true);
    expect(isTokenNearExpiry(-100)).toBe(true);
    expect(isTokenNearExpiry(299)).toBe(true); // Less than 300 seconds
  });

  it('should detect valid token', () => {
    expect(isTokenNearExpiry(301)).toBe(false);
    expect(isTokenNearExpiry(1000)).toBe(false);
  });
});
