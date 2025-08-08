import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  type: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote: boolean;
  postedDate: string;
  applicationDeadline?: string;
  status: 'active' | 'closed' | 'draft';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface JobStore {
  currentJob: Job | null;
  jobs: Job[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentJob: (job: Job | null) => void;
  setJobs: (jobs: Job[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useJobStore = create<JobStore>()(
  devtools(
    (set) => ({
      currentJob: null,
      jobs: [],
      isLoading: false,
      error: null,

      setCurrentJob: (job) => set({ currentJob: job }),
      setJobs: (jobs) => set({ jobs }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error })
    }),
    {
      name: 'job-store'
    }
  )
); 