import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCampaignRecipients } from './userSyncService';
import User from '@/models/User';

vi.mock('@/lib/database', () => ({
  default: vi.fn().mockResolvedValue(null),
  getConnection: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/models/User', () => {
  const mockLean = vi.fn();
  const mockFind = vi.fn().mockReturnValue({
    lean: mockLean,
  });
  const mockCount = vi.fn().mockResolvedValue(0);
  return {
    default: {
      find: mockFind,
      countDocuments: mockCount,
    }
  };
});

vi.mock('@/models', () => ({
  User: {},
  CV: {},
  TemporaryCVDraft: {},
}));

describe('userSyncService - resolveCampaignRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve and merge database and CSV recipients', async () => {
    const mockDbUsers = [
      { _id: 'db1', email: 'db1@example.com', firstName: 'John', lastName: 'Doe', currentPlanKey: 'premium', createdAt: '2026-01-01' }
    ];

    // Mock User.find().lean() to return database users
    const mockFindResult = User.find() as any;
    mockFindResult.lean.mockResolvedValue(mockDbUsers);

    const csvRecipients = [
      { name: 'Jane Smith', email: 'csv1@example.com' }
    ];

    const result = await resolveCampaignRecipients({}, csvRecipients);

    expect(result).toHaveLength(2);
    
    // DB user checks
    const dbEntry = result.find(r => r.email === 'db1@example.com');
    expect(dbEntry).toBeDefined();
    expect(dbEntry.userId).toBe('db1');
    expect(dbEntry.firstName).toBe('John');
    expect(dbEntry.isCsv).toBe(false);
    expect(dbEntry.removed).toBe(false);
    expect(dbEntry.status).toBe('pending');

    // CSV user checks
    const csvEntry = result.find(r => r.email === 'csv1@example.com');
    expect(csvEntry).toBeDefined();
    expect(csvEntry.userId).toBeUndefined();
    expect(csvEntry.firstName).toBe('Jane');
    expect(csvEntry.lastName).toBe('Smith');
    expect(csvEntry.isCsv).toBe(true);
    expect(csvEntry.removed).toBe(false);
  });

  it('should deduplicate recipients by email, preferring DB entries over CSV', async () => {
    const mockDbUsers = [
      { _id: 'db1', email: 'duplicate@example.com', firstName: 'John', lastName: 'Doe', currentPlanKey: 'premium' }
    ];

    const mockFindResult = User.find() as any;
    mockFindResult.lean.mockResolvedValue(mockDbUsers);

    const csvRecipients = [
      { name: 'Jane Smith', email: 'duplicate@example.com' } // Same email
    ];

    const result = await resolveCampaignRecipients({}, csvRecipients);

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('duplicate@example.com');
    expect(result[0].isCsv).toBe(false); // Prefers DB entry (processed first)
    expect(result[0].userId).toBe('db1');
  });

  it('should preserve removed state for existing recipients', async () => {
    const mockDbUsers = [
      { _id: 'db1', email: 'db1@example.com', firstName: 'John' },
      { _id: 'db2', email: 'db2@example.com', firstName: 'Jane' }
    ];

    const mockFindResult = User.find() as any;
    mockFindResult.lean.mockResolvedValue(mockDbUsers);

    const existingRecipients = [
      { email: 'db1@example.com', removed: true, status: 'pending' },
      { email: 'db2@example.com', removed: false, status: 'sent' }
    ];

    const result = await resolveCampaignRecipients({}, [], existingRecipients);

    expect(result).toHaveLength(2);
    
    const db1 = result.find(r => r.email === 'db1@example.com');
    expect(db1.removed).toBe(true); // Preserved!
    expect(db1.status).toBe('pending');

    const db2 = result.find(r => r.email === 'db2@example.com');
    expect(db2.removed).toBe(false);
    expect(db2.status).toBe('sent'); // Preserved!
  });
});
