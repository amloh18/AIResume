import { NotificationPriority, NotificationCategory } from './templates';

export interface FrequencyRule {
  category: NotificationCategory;
  maxPerHour: number;
  maxPerDay: number;
  cooldownMinutes: number;
  allowDuplicates: boolean;
}

export interface PriorityRule {
  priority: NotificationPriority;
  showToast: boolean;
  requiresAction: boolean;
  persistent: boolean;
  soundEnabled: boolean;
}

export const FREQUENCY_RULES: Record<NotificationCategory, FrequencyRule> = {
  application_tracker: {
    category: 'application_tracker',
    maxPerHour: 10,
    maxPerDay: 50,
    cooldownMinutes: 1,
    allowDuplicates: false,
  },
  ats_score: {
    category: 'ats_score',
    maxPerHour: 5,
    maxPerDay: 20,
    cooldownMinutes: 5,
    allowDuplicates: false,
  },
  cv_document: {
    category: 'cv_document',
    maxPerHour: 8,
    maxPerDay: 30,
    cooldownMinutes: 2,
    allowDuplicates: true,
  },
  analytics: {
    category: 'analytics',
    maxPerHour: 2,
    maxPerDay: 5,
    cooldownMinutes: 60,
    allowDuplicates: false,
  },
  payment: {
    category: 'payment',
    maxPerHour: 3,
    maxPerDay: 10,
    cooldownMinutes: 10,
    allowDuplicates: false,
  },
  system: {
    category: 'system',
    maxPerHour: 2,
    maxPerDay: 10,
    cooldownMinutes: 30,
    allowDuplicates: false,
  },
  account: {
    category: 'account',
    maxPerHour: 2,
    maxPerDay: 5,
    cooldownMinutes: 30,
    allowDuplicates: false,
  },
};

export const PRIORITY_RULES: Record<NotificationPriority, PriorityRule> = {
  critical: {
    priority: 'critical',
    showToast: true,
    requiresAction: true,
    persistent: true,
    soundEnabled: true,
  },
  high: {
    priority: 'high',
    showToast: true,
    requiresAction: false,
    persistent: true,
    soundEnabled: false,
  },
  medium: {
    priority: 'medium',
    showToast: true,
    requiresAction: false,
    persistent: false,
    soundEnabled: false,
  },
  low: {
    priority: 'low',
    showToast: false,
    requiresAction: false,
    persistent: false,
    soundEnabled: false,
  },
};

export class NotificationFrequencyManager {
  private notificationLog: Map<string, { timestamps: number[]; lastNotification: number }> = new Map();

  canSendNotification(
    category: NotificationCategory,
    userId: string,
    notificationKey?: string
  ): { allowed: boolean; reason?: string } {
    const rule = FREQUENCY_RULES[category];
    if (!rule) {
      return { allowed: true };
    }

    const now = Date.now();
    const key = `${userId}:${category}:${notificationKey || 'general'}`;
    const log = this.notificationLog.get(key);

    if (!log) {
      this.notificationLog.set(key, { timestamps: [now], lastNotification: now });
      return { allowed: true };
    }

    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const recentTimestamps = log.timestamps.filter((t) => t > dayAgo);
    const lastHourCount = recentTimestamps.filter((t) => t > hourAgo).length;
    const lastDayCount = recentTimestamps.length;

    if (lastHourCount >= rule.maxPerHour) {
      return {
        allowed: false,
        reason: `Exceeded ${rule.maxPerHour} notifications per hour for ${category}`,
      };
    }

    if (lastDayCount >= rule.maxPerDay) {
      return {
        allowed: false,
        reason: `Exceeded ${rule.maxPerDay} notifications per day for ${category}`,
      };
    }

    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    if (now - log.lastNotification < cooldownMs) {
      return {
        allowed: false,
        reason: `Cooldown period active (${rule.cooldownMinutes} minutes)`,
      };
    }

    if (!rule.allowDuplicates && notificationKey) {
      const recentDuplicates = recentTimestamps.filter(
        (t) => now - t < 60 * 60 * 1000
      );
      if (recentDuplicates.length > 0) {
        return {
          allowed: false,
          reason: 'Duplicate notification within cooldown period',
        };
      }
    }

    log.timestamps.push(now);
    log.timestamps = log.timestamps.filter((t) => t > dayAgo);
    log.lastNotification = now;
    this.notificationLog.set(key, log);

    return { allowed: true };
  }

  resetUserLog(userId: string, category?: NotificationCategory) {
    if (category) {
      const keysToDelete: string[] = [];
      this.notificationLog.forEach((_, key) => {
        if (key.startsWith(`${userId}:${category}:`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.notificationLog.delete(key));
    } else {
      const keysToDelete: string[] = [];
      this.notificationLog.forEach((_, key) => {
        if (key.startsWith(`${userId}:`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.notificationLog.delete(key));
    }
  }

  cleanupOldLogs() {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.notificationLog.forEach((log, key) => {
      log.timestamps = log.timestamps.filter((t) => t > dayAgo);
      if (log.timestamps.length === 0) {
        this.notificationLog.delete(key);
      }
    });
  }
}

export const globalFrequencyManager = new NotificationFrequencyManager();

setInterval(() => {
  globalFrequencyManager.cleanupOldLogs();
}, 60 * 60 * 1000);

export const shouldShowToast = (priority: NotificationPriority): boolean => {
  return PRIORITY_RULES[priority].showToast;
};

export const shouldPersist = (priority: NotificationPriority): boolean => {
  return PRIORITY_RULES[priority].persistent;
};

export const requiresAction = (priority: NotificationPriority): boolean => {
  return PRIORITY_RULES[priority].requiresAction;
};
