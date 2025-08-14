export interface CVAnalytics {
  cvId: string;
  userId: string;
  viewCount: number;
  downloadCount: number;
  lastViewed?: Date;
  healthScore: number;
  atsScore: number;
  keywords: {
    strengths: string[];
    gaps: string[];
  };
  lastCalculated: Date;
}

export interface CVHealthMetrics {
  completionScore: number;
  atsComplianceScore: number;
  keywordOptimizationScore: number;
  overallScore: number;
  suggestions: string[];
}

export class CVAnalyticsService {
  static async getViewsTotal(userId: string): Promise<number> {
    const response = await fetch(`/api/analytics/cv-views?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch CV views');
    }
    
    const data = await response.json();
    return data.totalViews || 0;
  }

  static async getCVAnalytics(cvId: string): Promise<CVAnalytics> {
    const response = await fetch(`/api/analytics/cv/${cvId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch CV analytics');
    }
    
    const data = await response.json();
    return data.analytics;
  }

  static async incrementView(cvId: string): Promise<void> {
    const response = await fetch(`/api/analytics/cv/${cvId}/view`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to increment view');
    }
  }

  static async incrementDownload(cvId: string): Promise<void> {
    const response = await fetch(`/api/analytics/cv/${cvId}/download`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to increment download');
    }
  }

  static async calculateHealthScore(cvId: string): Promise<CVHealthMetrics> {
    const response = await fetch(`/api/ai/ats-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cvId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to calculate health score');
    }
    
    const data = await response.json();
    return data.healthMetrics;
  }

  static async getKeywordsAnalysis(cvId: string, jobId?: string): Promise<{
    strengths: string[];
    gaps: string[];
    atsScore: number;
  }> {
    const response = await fetch(`/api/ai/ats-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cvId, jobId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get keywords analysis');
    }
    
    const data = await response.json();
    return {
      strengths: data.strengths || [],
      gaps: data.gaps || [],
      atsScore: data.atsScore || 0
    };
  }

  // Dashboard-specific methods
  static async getDashboardAnalytics(userId: string): Promise<{
    totalViews: number;
    totalDownloads: number;
    averageHealthScore: number;
    publishedCVs: number;
    starredCVs: number;
  }> {
    const response = await fetch(`/api/analytics/dashboard?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard analytics');
    }
    
    const data = await response.json();
    return data.analytics;
  }

  static async getCVHealthScores(userId: string): Promise<{
    cvId: string;
    title: string;
    healthScore: number;
    lastCalculated: Date;
  }[]> {
    const response = await fetch(`/api/analytics/cv-health?userId=${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch CV health scores');
    }
    
    const data = await response.json();
    return data.healthScores;
  }

  // Studio-specific methods
  static async getRealTimeATSScore(cvId: string, jobId?: string): Promise<{
    atsScore: number;
    strengths: string[];
    gaps: string[];
    suggestions: string[];
  }> {
    const response = await fetch(`/api/ai/ats-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cvId, jobId, realTime: true }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get real-time ATS score');
    }
    
    const data = await response.json();
    return {
      atsScore: data.atsScore || 0,
      strengths: data.strengths || [],
      gaps: data.gaps || [],
      suggestions: data.suggestions || []
    };
  }

  static async cacheATSResults(cvId: string, results: any): Promise<void> {
    const response = await fetch(`/api/analytics/cache-ats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cvId, results }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to cache ATS results');
    }
  }

  static async getCachedATSResults(cvId: string): Promise<any> {
    const response = await fetch(`/api/analytics/cache-ats?cvId=${cvId}`);
    if (!response.ok) {
      throw new Error('Failed to get cached ATS results');
    }
    
    const data = await response.json();
    return data.results;
  }
}
