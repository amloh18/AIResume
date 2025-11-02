import { Job } from '@/lib/stores/jobStore';

export interface JobFilters {
  userId?: string;
  status?: 'created' | 'applied' | 'interview' | 'offer' | 'rejected';
  period?: 'day' | 'week' | 'month' | 'all';
  sort?: 'createdAt' | 'updatedAt' | 'company' | 'title';
  limit?: number;
  hasInterviewWithin?: 'week' | 'month';
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  counts: {
    total: number;
    created: number;
    applied: number;
    interview: number;
    offer: number;
    rejected: number;
  };
  summary: {
    totalJobs: number;
    created: number;
    applied: number;
    interviews: number;
    offers: number;
    deltas: {
      totalJobs: string;
      created: string;
      applied: string;
      interviews: string;
      offers: string;
    };
  };
}

export class JobService {
  static async getJob(jobId: string, userId?: string): Promise<Job> {
    if (!userId) {
      throw new Error('User ID is required to fetch job');
    }
    
    const response = await fetch(`/api/jobs?userId=${userId}&jobId=${jobId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch job');
    }
    const data = await response.json();
    
    // Extract job data from the response
    let jobData;
    if (data.data?.jobs) {
      // If we got a list of jobs, find the specific one
      jobData = data.data.jobs.find((job: any) => job.id === jobId || job._id === jobId);
    } else {
      // If we got a single job directly
      jobData = data.job || data;
    }
    
    if (!jobData) {
      throw new Error('Job not found');
    }
    
    return jobData;
  }

  static async getJobs(filters: JobFilters = {}): Promise<JobListResponse> {
    const params = new URLSearchParams();
    
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.status) params.append('status', filters.status);
    if (filters.period) params.append('period', filters.period);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.hasInterviewWithin) params.append('hasInterviewWithin', filters.hasInterviewWithin);

    const response = await fetch(`/api/jobs?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch jobs');
    }
    const data = await response.json();
    return data;
  }

  static async createJob(job: Partial<Job>): Promise<Job> {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(job),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create job');
    }
    
    const data = await response.json();
    return data.job;
  }

  static async updateJob(jobId: string, job: Partial<Job>): Promise<Job> {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(job),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update job');
    }
    
    const data = await response.json();
    return data.job;
  }

  static async deleteJob(jobId: string): Promise<void> {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete job');
    }
  }

  static async updateJobStatus(jobId: string, status: string): Promise<Job> {
    const response = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update job status');
    }
    
    const data = await response.json();
    return data.job;
  }

  static async addInterview(jobId: string, interview: {
    date: string;
    type: string;
    location?: string;
    notes?: string;
  }): Promise<Job> {
    const response = await fetch(`/api/jobs/${jobId}/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(interview),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add interview');
    }
    
    const data = await response.json();
    return data.job;
  }

  static async updateInterview(jobId: string, interviewId: string, interview: {
    date: string;
    type: string;
    location?: string;
    notes?: string;
  }): Promise<Job> {
    const response = await fetch(`/api/jobs/${jobId}/interviews/${interviewId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(interview),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update interview');
    }
    
    const data = await response.json();
    return data.job;
  }

  static async deleteInterview(jobId: string, interviewId: string): Promise<Job> {
    const response = await fetch(`/api/jobs/${jobId}/interviews/${interviewId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete interview');
    }
    
    const data = await response.json();
    return data.job;
  }

  // Dashboard-specific methods
  static async getJobCounts(userId: string, period: string = 'week'): Promise<{
    total: number;
    created: number;
    applied: number;
    interview: number;
    offer: number;
    rejected: number;
  }> {
    const response = await this.getJobs({ userId, period: period as 'day' | 'week' | 'month' | 'all' });
    return response.counts;
  }

  static async getUpcomingInterviews(userId: string, within: 'week' | 'month' = 'week'): Promise<Job[]> {
    const response = await this.getJobs({ 
      userId, 
      hasInterviewWithin: within,
      sort: 'createdAt'
    });
    return response.jobs.filter(job =>
      (job as any).interviews && (job as any).interviews.length > 0
    );
  }

  static async getJobsByStatus(userId: string, status: string): Promise<Job[]> {
    const response = await this.getJobs({ userId, status: status as any });
    return response.jobs;
  }

  // Job Tracker specific methods
  static async getJobSummary(userId: string, period: string = 'week'): Promise<{
    totalJobs: number;
    created: number;
    applied: number;
    interviews: number;
    offers: number;
    deltas: {
      totalJobs: string;
      created: string;
      applied: string;
      interviews: string;
      offers: string;
    };
  }> {
    const response = await this.getJobs({ userId, period: period as 'day' | 'week' | 'month' | 'all' });
    return response.summary;
  }

  static async moveJobToStatus(jobId: string, newStatus: string): Promise<Job> {
    return await this.updateJobStatus(jobId, newStatus);
  }

  // Studio integration methods
  static async getJobsForCV(cvId: string, userId: string): Promise<Job[]> {
    const response = await this.getJobs({ userId, sort: 'createdAt' });
    return response.jobs;
  }

  static async linkJobToCV(jobId: string, cvId: string): Promise<Job> {
    const response = await fetch(`/api/jobs/${jobId}/link-cv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cvId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to link job to CV');
    }
    
    const data = await response.json();
    return data.job;
  }
} 