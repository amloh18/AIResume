import { describe, expect, it } from 'vitest';
import { toUserFacingMessage } from './user-facing-error';

const ATLAS_QUOTA_ERROR =
  'you are over your space quota, using 512 MB of 512 MB. Writes are blocked on your cluster. ' +
  'Free up storage by deleting unnecessary data or add storage by updating cluster tier. ' +
  'Add a payment method and scale cluster tier in Atlas: https://cloud.mongodb.com/v2/688a40581e9a6a196a65986d#/clusters/upgradeTemplates/Cluster0?limit=storage';

describe('toUserFacingMessage', () => {
  it('replaces the MongoDB Atlas quota error with the fallback', () => {
    expect(toUserFacingMessage(ATLAS_QUOTA_ERROR, 'Fallback.')).toBe('Fallback.');
  });

  it('replaces connection errors with the fallback', () => {
    const err = new Error('connect ECONNREFUSED 127.0.0.1:27017');
    expect(toUserFacingMessage(err, 'Fallback.')).toBe('Fallback.');
  });

  it('replaces mongoose/driver internals with the fallback', () => {
    expect(
      toUserFacingMessage('MongooseServerSelectionError: getaddrinfo ENOTFOUND mongodb', 'Fallback.')
    ).toBe('Fallback.');
  });

  it('passes ordinary messages through unchanged', () => {
    const msg = "We couldn't complete the application on the employer's site.";
    expect(toUserFacingMessage(msg, 'Fallback.')).toBe(msg);
  });

  it('passes ordinary Error instances through unchanged', () => {
    const err = new Error('This job requires a valid work permit.');
    expect(toUserFacingMessage(err, 'Fallback.')).toBe('This job requires a valid work permit.');
  });

  it('returns the fallback for empty and unknown input', () => {
    expect(toUserFacingMessage(undefined, 'Fallback.')).toBe('Fallback.');
    expect(toUserFacingMessage(null, 'Fallback.')).toBe('Fallback.');
    expect(toUserFacingMessage('', 'Fallback.')).toBe('Fallback.');
    expect(toUserFacingMessage({}, 'Fallback.')).toBe('Fallback.');
  });

  it('uses the default fallback when none is provided', () => {
    expect(toUserFacingMessage('connect ECONNREFUSED 10.0.0.1:27017')).toBe(
      "Something went wrong on our side. Please try again in a moment."
    );
  });
});
