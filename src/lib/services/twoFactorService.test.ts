import { describe, it, expect } from 'vitest';
import {
  generateTwoFactorCode,
  generateRecoveryCodes,
  hashRecoveryCode,
} from '@/lib/services/twoFactorService';

describe('TwoFactorService', () => {
  describe('generateTwoFactorCode', () => {
    it('should generate a 4-digit code', () => {
      const code = generateTwoFactorCode();
      expect(code).toMatch(/^\d{4}$/);
    });

    it('should generate different codes on multiple calls', () => {
      const code1 = generateTwoFactorCode();
      const code2 = generateTwoFactorCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('should generate 5 recovery codes', () => {
      const codes = generateRecoveryCodes();
      expect(codes).toHaveLength(5);
    });

    it('should generate 8-character uppercase codes', () => {
      const codes = generateRecoveryCodes();
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });
  });

  describe('hashRecoveryCode', () => {
    it('should hash a recovery code', async () => {
      const code = 'ABC123DEF4';
      const hash = await hashRecoveryCode(code);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(code);
    });

    it('should produce different hashes for different codes', async () => {
      const hash1 = await hashRecoveryCode('CODE1234');
      const hash2 = await hashRecoveryCode('CODE5678');
      expect(hash1).not.toBe(hash2);
    });
  });
});
