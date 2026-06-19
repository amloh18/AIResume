import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanupGuestUsers } from './guestCleanupService';
import { User, CV, TemporaryCVDraft } from '@/models';

vi.mock('@/lib/database', () => ({
  getConnection: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/models', () => {
  const mockUser = {
    find: vi.fn(),
    deleteOne: vi.fn(),
  };
  const mockCV = {
    findOne: vi.fn(),
  };
  const mockTemporaryCVDraft = {
    findOne: vi.fn(),
  };
  return {
    User: mockUser,
    CV: mockCV,
    TemporaryCVDraft: mockTemporaryCVDraft,
  };
});

describe('guestCleanupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 0 if no anonymous users exist', async () => {
    vi.mocked(User.find).mockResolvedValue([]);

    const result = await cleanupGuestUsers();

    expect(result).toBe(0);
    expect(User.find).toHaveBeenCalledTimes(1);
    expect(User.deleteOne).not.toHaveBeenCalled();
  });

  it('should preserve users who have a master CV in the CV collection', async () => {
    const mockUsers = [
      { _id: 'user1', email: 'guest1@example.com', isAnonymous: true, anonymousToken: 'token1' }
    ];
    vi.mocked(User.find).mockResolvedValue(mockUsers as any);
    vi.mocked(CV.findOne).mockResolvedValue({ _id: 'cv1', cvType: 'master' } as any);

    const result = await cleanupGuestUsers();

    expect(result).toBe(0);
    expect(CV.findOne).toHaveBeenCalledWith({
      userId: 'user1',
      $or: [
        { cvType: 'master' },
        { 'metadata.isMaster': true },
        { 'metadata.isMaster': 'true' }
      ]
    });
    expect(User.deleteOne).not.toHaveBeenCalled();
  });

  it('should preserve users who have a master CV draft in TemporaryCVDraft collection', async () => {
    const mockUsers = [
      { _id: 'user1', email: 'guest1@example.com', isAnonymous: true, anonymousToken: 'token1' }
    ];
    vi.mocked(User.find).mockResolvedValue(mockUsers as any);
    vi.mocked(CV.findOne).mockResolvedValue(null);
    vi.mocked(TemporaryCVDraft.findOne).mockResolvedValue({ _id: 'draft1', isForMasterCV: true } as any);

    const result = await cleanupGuestUsers();

    expect(result).toBe(0);
    expect(TemporaryCVDraft.findOne).toHaveBeenCalledWith({
      isForMasterCV: true,
      $or: [
        { userId: 'user1' },
        { sessionId: 'token1' }
      ]
    });
    expect(User.deleteOne).not.toHaveBeenCalled();
  });

  it('should delete users who have no master CV or draft', async () => {
    const mockUsers = [
      { _id: 'user1', email: 'guest1@example.com', isAnonymous: true, anonymousToken: 'token1' }
    ];
    vi.mocked(User.find).mockResolvedValue(mockUsers as any);
    vi.mocked(CV.findOne).mockResolvedValue(null);
    vi.mocked(TemporaryCVDraft.findOne).mockResolvedValue(null);
    vi.mocked(User.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

    const result = await cleanupGuestUsers();

    expect(result).toBe(1);
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'user1' });
  });
});
