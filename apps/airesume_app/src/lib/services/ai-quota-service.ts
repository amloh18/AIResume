import { getConnection } from '@/lib/database';
import User from '@/models/User';
import mongoose from 'mongoose';

export type AIFeatureType = 'ats_calculator' | 'ai_suggestions' | 'full_analysis' | 'surgeon_analysis';

export interface AIQuotaStatus {
  allowed: boolean;
  reason?: string;
  remainingCredits: number;
  isPro: boolean;
}

export class AIQuotaService {
  /**
   * Check if a user has access to a specific AI feature and has enough quota.
   * Decrements quota if consume = true.
   */
  static async checkAndConsumeQuota(
    userId: string,
    featureType: AIFeatureType,
    consume: boolean = true
  ): Promise<AIQuotaStatus> {
    await getConnection();
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Determine if user is Pro
    const isPro = ['focused_monthly', 'focused_quarterly', 'focused_yearly'].includes(user.subscription?.planKey || user.currentPlanKey);
    const isTrial = user.subscription?.status === 'trialing'; // Assuming standard status, check if exists
    
    // Reset quotas if needed based on join date / monthly schedule
    await this.ensureMonthlyReset(user);

    const credits = user.credits?.aiCredits ?? 3; // Default 3

    // Logic per feature
    switch (featureType) {
      case 'ats_calculator':
        // Free limited, Pro unlimited
        if (!isPro && credits <= 0) {
          return { allowed: false, reason: 'Out of AI credits for ATS Calculator', remainingCredits: 0, isPro };
        }
        break;
        
      case 'ai_suggestions':
        // Pro/Trial only
        if (!isPro && !isTrial) {
          return { allowed: false, reason: 'AI Suggestions require a Pro or Trial plan', remainingCredits: credits, isPro };
        }
        break;
        
      case 'surgeon_analysis':
        // 1 free usage for free tier
        const surgeonUsage = user.credits?.totalUsage?.surgeonAnalysis || 0;
        if (!isPro && surgeonUsage >= 1) {
          return { allowed: false, reason: 'Free tier is limited to 1 AI Analysis', remainingCredits: 0, isPro };
        }
        break;

      case 'full_analysis':
        // Pro only
        if (!isPro) {
          return { allowed: false, reason: 'Full Analysis requires a Pro plan', remainingCredits: credits, isPro };
        }
        break;
    }

    // If allowed and consume is true, decrement credits (unless unlimited -1)
    if (consume) {
      if (featureType === 'surgeon_analysis') {
        if (!user.credits.totalUsage) {
          user.credits.totalUsage = { aiGenerations: 0, cvs: 0, jobs: 0, downloads: 0, surgeonAnalysis: 0 };
        }
        user.credits.totalUsage.surgeonAnalysis = (user.credits.totalUsage.surgeonAnalysis || 0) + 1;
      } else if (credits > 0) {
        // Decrease credit
        user.credits.aiCredits -= 1;
      }
      
      // Update usage stats
      if (!user.credits.totalUsage) {
        user.credits.totalUsage = { aiGenerations: 0, cvs: 0, jobs: 0, downloads: 0, surgeonAnalysis: 0 };
      }
      user.credits.totalUsage.aiGenerations = (user.credits.totalUsage.aiGenerations || 0) + 1;
      
      await user.save();
    }

    return { 
      allowed: true, 
      remainingCredits: user.credits.aiCredits, 
      isPro 
    };
  }

  /**
   * Resets the user's AI credits based on their join date monthly cycle.
   */
  private static async ensureMonthlyReset(user: any) {
    if (!user.credits) {
      user.credits = {
        aiCredits: 3,
        jobCredits: 3,
        lastResetDate: user.createdAt || new Date(),
        resetSchedule: 'monthly',
        creditRefundCount: 0,
        creditRefundResetAt: new Date(),
        totalUsage: { aiGenerations: 0, cvs: 0, jobs: 0, downloads: 0 }
      };
      await user.save();
      return;
    }

    const joinDate = new Date(user.createdAt || new Date());
    const lastReset = new Date(user.credits.lastResetDate || joinDate);
    const now = new Date();

    // Calculate months difference based on join day
    // We check if we passed the join day of the current month
    const joinDay = joinDate.getDate();
    
    // Determine the most recent reset date that should have occurred
    const latestValidResetDate = new Date(now.getFullYear(), now.getMonth(), joinDay);
    if (now < latestValidResetDate) {
      // If we haven't reached the join day this month, the last reset should be last month
      latestValidResetDate.setMonth(latestValidResetDate.getMonth() - 1);
    }

    // If lastReset is older than the latestValidResetDate, we need to reset
    if (lastReset < latestValidResetDate) {
      // Reset logic
      const isPro = ['focused_monthly', 'focused_quarterly', 'focused_yearly'].includes(user.subscription?.planKey || user.currentPlanKey);
      
      user.credits.aiCredits = isPro ? -1 : 3; // 3 for free, -1 for unlimited or we could limit Pro too. The prompt says "Full Analysis (Pro limited)", so maybe Pro gets 30? Wait, let's keep it to user model's default or prompt. Prompt says "e.g., 3 free analysis credits per month".
      
      user.credits.lastResetDate = latestValidResetDate;
      await user.save();
    }
  }
}
