import { Job } from '@/lib/stores/jobStore';

export class JobService {
  static async getJob(jobId: string): Promise<Job> {
    const response = await fetch(`/api/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch job');
    }
    const data = await response.json();
    return data.job;
  }

  static async getUserJobs(): Promise<Job[]> {
    const response = await fetch('/api/jobs');
    if (!response.ok) {
      throw new Error('Failed to fetch user jobs');
    }
    const data = await response.json();
    return data.jobs;
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
} 