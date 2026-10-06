import { create } from 'zustand';

export type JobLiveStep =
  | 'saving'
  | 'tailoring_cv'
  | 'tailoring_cover_letter'
  | 'applying'
  | 'applied'
  | 'interview'
  | 'accepted'
  | 'failed'
  | 'idle'
  // Legacy steps (mapped from old flow)
  | 'matching'
  | 'tailoring'
  | 'queued'
  | 'submitting'
  | 'submitted';

export interface JobLiveStatusAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface JobLiveStatus {
  jobId: string;
  step: JobLiveStep;
  title: string;
  description: string;
  progress: number; // 0 to 100
  success?: boolean;
  company?: string;
  jobTitle?: string;
  actions?: JobLiveStatusAction[];
  autoCloseSeconds?: number;
  autoClosePaused?: boolean;
  createdAt: number;
}

interface JobLiveStatusStore {
  statuses: Record<string, JobLiveStatus>;
  
  // Actions
  setStatus: (jobId: string, status: Omit<JobLiveStatus, 'jobId' | 'createdAt'>) => void;
  updateStep: (jobId: string, updates: Partial<JobLiveStatus>) => void;
  clearStatus: (jobId: string) => void;
  pauseAutoClose: (jobId: string) => void;
  decrementTimer: (jobId: string) => void;
  getStatus: (jobId?: string) => JobLiveStatus | undefined;
}

export const useJobLiveStatusStore = create<JobLiveStatusStore>((set, get) => ({
  statuses: {},

  setStatus: (jobId, statusData) => {
    if (!jobId) return;
    const cleanId = String(jobId);
    set((state) => ({
      statuses: {
        ...state.statuses,
        [cleanId]: {
          ...statusData,
          jobId: cleanId,
          createdAt: Date.now(),
        },
      },
    }));
  },

  updateStep: (jobId, updates) => {
    if (!jobId) return;
    const cleanId = String(jobId);
    set((state) => {
      const existing = state.statuses[cleanId];
      if (!existing) return state;
      return {
        statuses: {
          ...state.statuses,
          [cleanId]: {
            ...existing,
            ...updates,
          },
        },
      };
    });
  },

  clearStatus: (jobId) => {
    if (!jobId) return;
    const cleanId = String(jobId);
    set((state) => {
      const next = { ...state.statuses };
      delete next[cleanId];
      return { statuses: next };
    });
  },

  pauseAutoClose: (jobId) => {
    if (!jobId) return;
    const cleanId = String(jobId);
    set((state) => {
      const existing = state.statuses[cleanId];
      if (!existing) return state;
      return {
        statuses: {
          ...state.statuses,
          [cleanId]: {
            ...existing,
            autoClosePaused: true,
          },
        },
      };
    });
  },

  decrementTimer: (jobId) => {
    if (!jobId) return;
    const cleanId = String(jobId);
    set((state) => {
      const existing = state.statuses[cleanId];
      if (!existing || existing.autoClosePaused) return state;
      const currentSeconds = existing.autoCloseSeconds ?? 0;
      if (currentSeconds <= 1) {
        const next = { ...state.statuses };
        delete next[cleanId];
        return { statuses: next };
      }
      return {
        statuses: {
          ...state.statuses,
          [cleanId]: {
            ...existing,
            autoCloseSeconds: currentSeconds - 1,
          },
        },
      };
    });
  },

  getStatus: (jobId) => {
    if (!jobId) return undefined;
    return get().statuses[String(jobId)];
  },
}));
