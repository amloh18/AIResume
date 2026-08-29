import mongoose from 'mongoose';
import CompanyWatchlist from '@/models/CompanyWatchlist';

export interface WatchlistCheckResult {
  isWatched: boolean;
  watchlistEntryId?: mongoose.Types.ObjectId | string;
  priority?: 'high' | 'medium' | 'low';
  userId?: mongoose.Types.ObjectId | string;
}

export class WatchlistService {
  /**
   * Check if a company is in any user's watchlist
   * Returns the highest priority match
   */
  async checkCompany(
    companyName: string,
    normalizedName?: string
  ): Promise<WatchlistCheckResult> {
    const name = normalizedName || companyName.toLowerCase().trim();
    
    const entry = await CompanyWatchlist.findOne({
      normalizedName: name,
      isActive: true,
    }).sort({ priority: 1 }); // high=1, medium=2, low=3

    if (!entry) {
      return { isWatched: false };
    }

    return {
      isWatched: true,
      watchlistEntryId: entry._id,
      priority: entry.priority,
      userId: entry.userId,
    };
  }

  /**
   * Check multiple companies at once
   * Returns a map of normalizedName -> check result
   */
  async checkCompanies(
    companyNames: string[]
  ): Promise<Map<string, WatchlistCheckResult>> {
    const results = new Map<string, WatchlistCheckResult>();
    
    const normalizedNames = companyNames.map(name => name.toLowerCase().trim());
    
    const entries = await CompanyWatchlist.find({
      normalizedName: { $in: normalizedNames },
      isActive: true,
    }).sort({ priority: 1 });

    // Initialize all as not watched
    for (const name of normalizedNames) {
      results.set(name, { isWatched: false });
    }

    // Mark watched companies (first entry per name wins due to sort)
    for (const entry of entries) {
      const existing = results.get(entry.normalizedName);
      if (existing && !existing.isWatched) {
        results.set(entry.normalizedName, {
          isWatched: true,
          watchlistEntryId: entry._id,
          priority: entry.priority,
          userId: entry.userId,
        });
      }
    }

    return results;
  }

  /**
   * Get all active watchlist entries for a user
   */
  async getUserWatchlist(userId: mongoose.Types.ObjectId | string) {
    return CompanyWatchlist.find({
      userId,
      isActive: true,
    }).sort({ priority: 1, createdAt: -1 });
  }

  /**
   * Get all unique watched company names across all users
   * Used by ingestion scheduler to prioritize discovery
   */
  async getAllWatchedCompanies(): Promise<Array<{
    normalizedName: string;
    companyName: string;
    atsType?: string;
    atsBoardUrl?: string;
  }>> {
    const entries = await CompanyWatchlist.find({ isActive: true })
      .select('normalizedName companyName atsType atsBoardUrl')
      .lean();

    // Deduplicate by normalizedName (keep first occurrence)
    const seen = new Set<string>();
    const unique: Array<{
      normalizedName: string;
      companyName: string;
      atsType?: string;
      atsBoardUrl?: string;
    }> = [];

    for (const entry of entries) {
      if (!seen.has(entry.normalizedName)) {
        seen.add(entry.normalizedName);
        unique.push({
          normalizedName: entry.normalizedName,
          companyName: entry.companyName,
          atsType: entry.atsType,
          atsBoardUrl: entry.atsBoardUrl,
        });
      }
    }

    return unique;
  }

  /**
   * Update discovery stats for a watched company
   */
  async recordDiscovery(
    companyName: string,
    userId?: mongoose.Types.ObjectId | string
  ): Promise<void> {
    const normalizedName = companyName.toLowerCase().trim();
    
    const query: any = { normalizedName, isActive: true };
    if (userId) {
      query.userId = userId;
    }

    await CompanyWatchlist.updateMany(query, {
      $set: { lastDiscoveredAt: new Date() },
      $inc: { jobsDiscovered: 1 },
    });
  }
}

export const watchlistService = new WatchlistService();
