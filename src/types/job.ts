import { JobJourneySnapshot } from './job-relationship';

export interface JobApplication {
  id: string;
  _id: string;
  relationship?: JobJourneySnapshot | null;
  userId: string;
  jobTitle: string;
  title?: string;
  company: string;
  trustSnapshot?: any;
  companyLogo?: string;
  matchScore?: number;
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  jobDescription?: string;
  description?: string;
  location?: string;
  jobUrl?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  type?: string;
  source?: string;
  sourceUrl?: string;
  postedDate?: Date;
  applicationDate?: Date;
  deadline?: Date;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  noteEntries?: Array<{ id: string; content: string; date: Date | string }>;
  sponsorship?: 'yes' | 'no' | 'unknown';
  tags?: string[];
  contactDetails?: {
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  interviews?: any[];
  followUps?: any[];
  attachments?: any[];
  contacts?: Array<{
    name: string;
    role?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
  }>;
  offerDetails?: {
    salary?: number;
    bonus?: string;
    equity?: string;
    deadline?: Date;
    status?: string;
  };
  atsScore?: number;
  atsAnalysis?: any;
  statusHistory?: any[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}
