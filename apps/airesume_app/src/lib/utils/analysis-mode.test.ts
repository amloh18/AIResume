// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
import { describe, it, expect } from 'vitest';
import { getAnalysisModeWithValidation } from './analysis-mode';
import { validateRole, validateJD, sanitizeInput } from './cv-data-validator';

describe('Analysis Mode Hardening Tests', () => {

    describe('Input Sanitization', () => {
        it('should handle null and undefined', () => {
            expect(sanitizeInput(null)).toBeNull();
            expect(sanitizeInput(undefined)).toBeNull();
        });

        it('should treat empty or whitespace-only strings as null', () => {
            expect(sanitizeInput('')).toBeNull();
            expect(sanitizeInput('   ')).toBeNull();
            expect(sanitizeInput('\n\t')).toBeNull();
        });

        it('should trim and normalize whitespace', () => {
            expect(sanitizeInput('  test  string  ')).toBe('test string');
            expect(sanitizeInput('multiple   spaces')).toBe('multiple spaces');
        });
    });

    describe('JD Validation', () => {
        it('should reject short JDs', () => {
            const shortJD = 'These are just a few words not enough for analysis';
            const result = validateJD(shortJD);
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('too short');
        });

        it('should accept valid JDs', () => {
            // Create a dummy JD with > 50 words
            const validJD = Array(60).fill('word').join(' ');
            const result = validateJD(validJD);
            expect(result.isValid).toBe(true);
            expect(result.confidence).toBeGreaterThan(0);
        });

        it('should handle null JD', () => {
            const result = validateJD(null);
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('No job description');
        });
    });

    describe('Role Validation', () => {
        it('should flag generic roles', () => {
            const result = validateRole('Employee');
            expect(result.isValid).toBe(true); // Still valid technically
            expect(result.isGeneric).toBe(true);
            expect(result.confidence).toBeLessThan(0.5);
            expect(result.suggestions).toBeDefined();
        });

        it('should accept specific roles', () => {
            const result = validateRole('Senior Software Engineer');
            expect(result.isValid).toBe(true);
            expect(result.isGeneric).toBe(false);
            expect(result.confidence).toBeGreaterThan(0.7);
        });
    });

    describe('Analysis Mode Detection', () => {
        // Master CV Scenarios
        it('should detect Master CV mode correctly', () => {
            const result = getAnalysisModeWithValidation('master', 'Developer', 'Senior');
            expect(result.mode).toBe('role-based');
            expect(result.requiresRole).toBe(true);
            expect(result.requiresJD).toBe(false);
        });

        it('should warn if Master CV has JD', () => {
            const jd = Array(60).fill('word').join(' ');
            const result = getAnalysisModeWithValidation('master', 'Developer', 'Senior', jd);

            // Should stay role-based but have warnings
            expect(result.mode).toBe('role-based');
            expect(result.validationState).toBe('warning');
            expect(result.warnings.some(w => w.includes('Master CVs should not have job descriptions'))).toBe(true);
        });

        // Journey CV Scenarios
        it('should enforce JD for Journey CV', () => {
            const result = getAnalysisModeWithValidation('journey', 'Developer', 'Senior', null);
            expect(result.mode).toBe('insufficient-data');
            expect(result.validationState).toBe('error');
            expect(result.missingDataReasons.some(r => r.includes('requires a job description'))).toBe(true);
        });

        it('should detect Journey CV mode when valid', () => {
            const jd = Array(60).fill('word').join(' ');
            const result = getAnalysisModeWithValidation('journey', 'Developer', 'Senior', jd);
            expect(result.mode).toBe('jd-based');
            expect(result.hasJD).toBe(true);
        });

        // Standalone CV Scenarios
        it('should detect insufficient data for empty Standalone', () => {
            const result = getAnalysisModeWithValidation('standalone', null, null, null);
            expect(result.mode).toBe('insufficient-data');
        });

        it('should detect role-based mode for Standalone', () => {
            const result = getAnalysisModeWithValidation('standalone', 'Developer', 'Senior', null);
            expect(result.mode).toBe('role-based');
        });

        it('should detect jd-based mode for Standalone (no role)', () => {
            const jd = Array(60).fill('word').join(' ');
            const result = getAnalysisModeWithValidation('standalone', null, null, jd);
            expect(result.mode).toBe('jd-based');
        });

        it('should detect hybrid mode for Standalone', () => {
            const jd = Array(60).fill('word').join(' ');
            const result = getAnalysisModeWithValidation('standalone', 'Developer', 'Senior', jd);
            expect(result.mode).toBe('hybrid');
        });

        it('should warn on title mismatch in hybrid mode', () => {
            const jd = Array(60).fill('word').join(' ');
            // Mock jobData with different title
            const jobData = { jobTitle: 'HR Manager' };
            const result = getAnalysisModeWithValidation(
                'standalone',
                'Software Engineer',
                'Senior',
                jd,
                jobData
            );

            expect(result.mode).toBe('hybrid');
            expect(result.warnings.some(w => w.includes('differ'))).toBe(true);
        });
    });
});
