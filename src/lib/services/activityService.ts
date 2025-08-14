export interface Activity {
  id: string;
  userId: string;
  type: 'cv.create' | 'cv.update' | 'cv.publish' | 'cv.delete' | 'job.create' | 'job.update' | 'job.status_change' | 'cover_letter.create' | 'cover_letter.update';
  description: string;
  metadata?: {
    cvId?: string;
    jobId?: string;
    coverLetterId?: string;
    oldStatus?: string;
    newStatus?: string;
    title?: string;
    company?: string;
  };
  createdAt: Date;
}

export interface ActivityFilters {
  userId: string;
  types?: string[];
  limit?: number;
  since?: Date;
}

export class ActivityService {
  static async getRecent(userId: string, filters: Partial<ActivityFilters> = {}): Promise<Activity[]> {
    const params = new URLSearchParams();
    params.append('userId', userId);
    
    if (filters.types) {
      filters.types.forEach(type => params.append('types', type));
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.since) {
      params.append('since', filters.since.toISOString());
    }

    const response = await fetch(`/api/activity?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch activity');
    }
    
    const data = await response.json();
    return data.activities || [];
  }

  static async logActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    const response = await fetch('/api/activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity),
    });
    
    if (!response.ok) {
      throw new Error('Failed to log activity');
    }
    
    const data = await response.json();
    return data.activity;
  }

  // Convenience methods for common activities
  static async logCVCreated(userId: string, cvId: string, title: string): Promise<Activity> {
    return await this.logActivity({
      userId,
      type: 'cv.create',
      description: `Created CV: ${title}`,
      metadata: { cvId, title }
    });
  }

  static async logCVUpdated(userId: string, cvId: string, title: string): Promise<Activity> {
    return await this.logActivity({
      userId,
      type: 'cv.update',
      description: `Updated CV: ${title}`,
      metadata: { cvId, title }
    });
  }

  static async logCVPublished(userId: string, cvId: string, title: string): Promise<Activity> {
    return await this.logActivity({
      userId,
      type: 'cv.publish',
      description: `Published CV: ${title}`,
      metadata: { cvId, title }
    });
  }

  static async logJobCreated(userId: string, jobId: string, title: string, company: string): Promise<Activity> {
    return await this.logActivity({
      userId,
      type: 'job.create',
      description: `Added job: ${title} at ${company}`,
      metadata: { jobId, title, company }
    });
  }

  static async logJobStatusChange(userId: string, jobId: string, title: string, company: string, oldStatus: string, newStatus: string): Promise<Activity> {
    return await this.logActivity({
      userId,
      type: 'job.status_change',
      description: `Updated ${title} at ${company}: ${oldStatus} → ${newStatus}`,
      metadata: { jobId, title, company, oldStatus, newStatus }
    });
  }

  static async logCoverLetterCreated(userId: string, coverLetterId: string, title: string): Promise<Activity> {
    return await this.logActivity({
      userId,
      type: 'cover_letter.create',
      description: `Created cover letter: ${title}`,
      metadata: { coverLetterId, title }
    });
  }

  // Dashboard-specific methods
  static async getDashboardActivity(userId: string, limit: number = 10): Promise<Activity[]> {
    return await this.getRecent(userId, {
      types: ['cv.create', 'cv.update', 'cv.publish', 'job.create', 'job.status_change', 'cover_letter.create'],
      limit
    });
  }

  static async getCVActivity(userId: string, cvId: string): Promise<Activity[]> {
    return await this.getRecent(userId, {
      types: ['cv.create', 'cv.update', 'cv.publish'],
      limit: 20
    }).then(activities => 
      activities.filter(activity => activity.metadata?.cvId === cvId)
    );
  }

  static async getJobActivity(userId: string, jobId: string): Promise<Activity[]> {
    return await this.getRecent(userId, {
      types: ['job.create', 'job.update', 'job.status_change'],
      limit: 20
    }).then(activities => 
      activities.filter(activity => activity.metadata?.jobId === jobId)
    );
  }
}
