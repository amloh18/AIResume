import { describe, it, expect } from 'vitest';
import { humanizeSaveApiError } from './save-error-messages';

describe('humanizeSaveApiError', () => {
  it('never passes the raw "CV not found" through for a 404', () => {
    const message = humanizeSaveApiError(404, 'CV not found');
    expect(message).not.toBe('CV not found');
    expect(message).not.toContain('CV not found');
    // Must tell the user their work is safe and what to do next.
    expect(message).toContain('still in this tab');
    expect(message).toContain('Refresh');
  });

  it('explains an expired session on 401', () => {
    const message = humanizeSaveApiError(401, 'Unauthorized');
    expect(message).not.toBe('Unauthorized');
    expect(message).toContain('session has expired');
    expect(message).toContain('still open in this tab');
  });

  it('keeps server messages for validation/other statuses', () => {
    expect(humanizeSaveApiError(400, 'Template cannot be null')).toBe('Template cannot be null');
    expect(humanizeSaveApiError(409, 'Conflict')).toBe('Conflict');
    expect(humanizeSaveApiError(429, 'Usage limit reached')).toBe('Usage limit reached');
  });

  it('falls back when the server sent no message', () => {
    expect(humanizeSaveApiError(500, null)).toBe('Failed to save CV. Please try again.');
    expect(humanizeSaveApiError(502, undefined)).toBe('Failed to save CV. Please try again.');
    expect(humanizeSaveApiError(500, '')).toBe('Failed to save CV. Please try again.');
  });
});
