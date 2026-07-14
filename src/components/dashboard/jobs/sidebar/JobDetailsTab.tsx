'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { JobApplication } from '@/types/job';
import MatchScoreGapWidget from '@/components/dashboard/jobs/widgets/MatchScoreGapWidget';
import AgingTrackerWidget from '@/components/dashboard/jobs/widgets/AgingTrackerWidget';
import InterviewPrepWidget from '@/components/dashboard/jobs/widgets/InterviewPrepWidget';
import CompBreakdownWidget from '@/components/dashboard/jobs/widgets/CompBreakdownWidget';
import PostMortemWidget from '@/components/dashboard/jobs/widgets/PostMortemWidget';

interface JobDetailsTabProps {
  job: JobApplication;
  user: any;
  onRefresh: () => Promise<void>;
  isEditingDetails: boolean;
  setIsEditingDetails: (val: boolean) => void;
  sidebarConfig: any;
  runSidebarAction: (actionId: any) => Promise<void>;
  nextFollowUpAt?: Date;
}

const JobDetailsTab: React.FC<JobDetailsTabProps> = ({
  job,
  user,
  onRefresh,
  isEditingDetails,
  setIsEditingDetails,
  sidebarConfig,
  runSidebarAction,
  nextFollowUpAt
}) => {
  const [editJobTitle, setEditJobTitle] = useState(job.jobTitle || '');
  const [editCompany, setEditCompany] = useState(job.company || '');
  const [editLocation, setEditLocation] = useState(job.location || '');
  const [editJobUrl, setEditJobUrl] = useState(job.jobUrl || '');
  const [editJobType, setEditJobType] = useState(job.jobType || job.type || 'full-time');
  const [editSalaryMin, setEditSalaryMin] = useState(job.salary?.min?.toString() || '');
  const [editSalaryMax, setEditSalaryMax] = useState(job.salary?.max?.toString() || '');
  const [editSalaryCurrency, setEditSalaryCurrency] = useState(job.salary?.currency || 'USD');
  const [editSalaryPeriod, setEditSalaryPeriod] = useState(job.salary?.period || 'yearly');
  const [editDeadline, setEditDeadline] = useState(job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '');
  const [editApplicationDate, setEditApplicationDate] = useState(job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : '');
  const [editPriority, setEditPriority] = useState(job.priority || 'medium');
  const [editStatus, setEditStatus] = useState(job.status || 'draft');
  const [editTags, setEditTags] = useState((job.tags || []).join(', '));
  const [editSponsorship, setEditSponsorship] = useState(job.sponsorship || 'unknown');
  const [editJobDescription, setEditJobDescription] = useState(job.jobDescription || '');
  const [editContactName, setEditContactName] = useState(job.contactDetails?.name || '');
  const [editContactEmail, setEditContactEmail] = useState(job.contactDetails?.email || '');
  const [editContactPhone, setEditContactPhone] = useState(job.contactDetails?.phone || '');
  const [editContactRole, setEditContactRole] = useState(job.contactDetails?.role || '');
  const [detailsSaveError, setDetailsSaveError] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [confirmJobTypeChoice, setConfirmJobTypeChoice] = useState(false);

  useEffect(() => {
    if (isEditingDetails) {
      setEditJobTitle(job.jobTitle || '');
      setEditCompany(job.company || '');
      setEditLocation(job.location || '');
      setEditJobUrl(job.jobUrl || '');
      setEditJobType(job.jobType || job.type || 'full-time');
      setEditSalaryMin(job.salary?.min?.toString() || '');
      setEditSalaryMax(job.salary?.max?.toString() || '');
      setEditSalaryCurrency(job.salary?.currency || 'USD');
      setEditSalaryPeriod(job.salary?.period || 'yearly');
      setEditDeadline(job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '');
      setEditApplicationDate(job.applicationDate ? new Date(job.applicationDate).toISOString().split('T')[0] : '');
      setEditPriority(job.priority || 'medium');
      setEditStatus(job.status || 'draft');
      setEditTags((job.tags || []).join(', '));
      setEditSponsorship(job.sponsorship || 'unknown');
      setEditJobDescription(job.jobDescription || '');
      setEditContactName(job.contactDetails?.name || '');
      setEditContactEmail(job.contactDetails?.email || '');
      setEditContactPhone(job.contactDetails?.phone || '');
      setEditContactRole(job.contactDetails?.role || '');
      setDetailsSaveError('');
      setConfirmJobTypeChoice(false);
    }
  }, [isEditingDetails, job]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editJobTitle.trim() || !editCompany.trim()) {
      toast.error('Job Title and Company are required');
      return;
    }

    const salaryMin = editSalaryMin ? Number(editSalaryMin) : undefined;
    const salaryMax = editSalaryMax ? Number(editSalaryMax) : undefined;
    if (salaryMin !== undefined && salaryMin < 0) {
      toast.error('Minimum salary cannot be negative');
      return;
    }
    if (salaryMax !== undefined && salaryMax < 0) {
      toast.error('Maximum salary cannot be negative');
      return;
    }
    if (salaryMin !== undefined && salaryMax !== undefined && salaryMin > salaryMax) {
      toast.error('Minimum salary cannot be greater than maximum salary');
      return;
    }

    if (!user?.id) return;
    try {
      setIsSavingDetails(true);
      setDetailsSaveError('');
      const validJobType = ['full-time', 'part-time', 'contract', 'internship'].includes(editJobType)
        ? editJobType
        : 'other';

      const payload: any = {
        jobTitle: editJobTitle.trim(),
        company: editCompany.trim(),
        location: editLocation.trim(),
        jobUrl: editJobUrl.trim(),
        jobType: validJobType,
        salary: {
          min: salaryMin,
          max: salaryMax,
          currency: editSalaryCurrency,
          period: editSalaryPeriod
        },
        deadline: editDeadline || undefined,
        applicationDate: editApplicationDate || undefined,
        priority: editPriority,
        status: editStatus,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        sponsorship: editSponsorship,
        jobDescription: editJobDescription.trim(),
        contactDetails: {
          name: editContactName.trim(),
          email: editContactEmail.trim(),
          phone: editContactPhone.trim(),
          role: editContactRole.trim()
        }
      };

      const jobId = job.id || job._id;
      const res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Job details updated successfully!');
        await onRefresh();
        setIsEditingDetails(false);
      } else {
        const errText = await res.text();
        let errorMessage = 'Failed to update job details.';
        try {
          const errJson = JSON.parse(errText);
          errorMessage = errJson.error || errJson.details || errorMessage;
        } catch (e) {
          // keep default
        }
        setDetailsSaveError(errorMessage);
        toast.error('Failed to save details');
      }
    } catch (error) {
      console.error('Error updating job:', error);
      setDetailsSaveError('An unexpected error occurred while saving.');
      toast.error('Failed to update job details');
    } finally {
      setIsSavingDetails(false);
    }
  };

  return (
    <div className="space-y-6 flex-1">
      {isEditingDetails ? (
        <form onSubmit={handleSaveDetails} className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Edit Job Details</h4>
            {detailsSaveError && (
              <span className="text-red-500 text-[11px] font-semibold">{detailsSaveError}</span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Job Title</label>
              <input
                type="text"
                required
                value={editJobTitle}
                onChange={(e) => setEditJobTitle(e.target.value)}
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Company</label>
              <input
                type="text"
                required
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Location</label>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Job URL</label>
              <input
                type="url"
                value={editJobUrl}
                onChange={(e) => setEditJobUrl(e.target.value)}
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Deadline</label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Application Date</label>
                <input
                  type="date"
                  value={editApplicationDate}
                  onChange={(e) => setEditApplicationDate(e.target.value)}
                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="draft">Draft</option>
                  <option value="created">Created</option>
                  <option value="applied">Applied</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="e.g. remote, urgent, referral"
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Sponsorship</label>
              <select
                value={editSponsorship}
                onChange={(e) => setEditSponsorship(e.target.value as 'yes' | 'no' | 'unknown')}
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="unknown">Unknown</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Job Description</label>
              <textarea
                value={editJobDescription}
                onChange={(e) => setEditJobDescription(e.target.value)}
                rows={4}
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Contact Role</label>
                <input
                  type="text"
                  value={editContactRole}
                  onChange={(e) => setEditContactRole(e.target.value)}
                  className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Job Type</label>
              <select
                value={editJobType}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'other' && !confirmJobTypeChoice) {
                    setConfirmJobTypeChoice(true);
                  }
                  setEditJobType(value);
                }}
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
                <option value="other">Other</option>
              </select>
              {confirmJobTypeChoice && editJobType === 'other' && (
                <p className="mt-1 text-[10px] text-yellow-600 dark:text-yellow-500">
                  Are you sure? Standard parsing works best with the predefined types.
                </p>
              )}
            </div>

            {/* Compensation Inputs */}
            <div className="pt-2 border-t border-gray-100 dark:border-white/10">
              <p className="text-[11px] font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Compensation (Optional)</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Min Salary</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editSalaryMin}
                    onChange={(e) => setEditSalaryMin(e.target.value)}
                    className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 80000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Max Salary</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editSalaryMax}
                    onChange={(e) => setEditSalaryMax(e.target.value)}
                    className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 120000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Currency</label>
                  <select
                    value={editSalaryCurrency}
                    onChange={(e) => setEditSalaryCurrency(e.target.value)}
                    className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Period</label>
                  <select
                    value={editSalaryPeriod}
                    onChange={(e) => setEditSalaryPeriod(e.target.value as 'hourly' | 'monthly' | 'yearly')}
                    className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="yearly">Yearly</option>
                    <option value="monthly">Monthly</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 dark:border-white/10 sticky bottom-0 bg-white/80 dark:bg-[#141810]/80 backdrop-blur-md py-4 z-10">
            <button
              type="button"
              onClick={() => { setIsEditingDetails(false); setDetailsSaveError(''); }}
              className="px-4 py-2 text-small font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingDetails}
              className="px-4 py-2 text-small font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSavingDetails ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        sidebarConfig.sections.showJobDetails && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Job Details</h4>
              <button
                onClick={() => setIsEditingDetails(true)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-[#273021]"
              >
                Edit
              </button>
            </div>

            <div className="space-y-3.5">
              {sidebarConfig.detailRows.map((row: any) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[130px_1fr] gap-4 items-center text-small"
                >
                  <span className="text-gray-500 dark:text-gray-400 font-semibold">{row.label}</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {row.label === 'Job URL' && job.jobUrl ? (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400 truncate flex items-center gap-1"
                      >
                        <span className="truncate">{job.jobUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{row.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      <div className="h-[1px] bg-gray-100 dark:bg-white/5" />

      <div className="space-y-4">
        {sidebarConfig.sections.showInsights && (
          <div className="flex justify-end">
            <button
              onClick={() => void runSidebarAction('open_insights')}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white dark:hover:bg-[#273021]"
            >
              Analytics
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-1">
          {(job.status === 'draft' || job.status === 'created') && (
            <MatchScoreGapWidget status={job.status} />
          )}
          {(job.status === 'applied' || job.status === 'screening') && (
            <AgingTrackerWidget status={job.status} applicationDate={job.applicationDate ? new Date(job.applicationDate) : undefined} deadline={job.deadline} nextFollowUpAt={nextFollowUpAt} />
          )}
          {job.status === 'interview' && (
            <InterviewPrepWidget status={job.status} />
          )}
          {job.status === 'offer' && (
            <CompBreakdownWidget status={job.status} salary={job.salary} offerDetails={(job as any).offerDetails} />
          )}
          {(job.status === 'rejected' || job.status === 'withdrawn' || job.status === 'accepted') && (
            <PostMortemWidget status={job.status} reasonTags={job.tags} startDate={job.applicationDate ? new Date(job.applicationDate) : undefined} />
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailsTab;
