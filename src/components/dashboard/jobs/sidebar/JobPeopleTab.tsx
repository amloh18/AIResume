'use client';

import React, { useState } from 'react';
import { Plus, Users, Globe, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { JobApplication } from '@/types/job';

interface JobPeopleTabProps {
  job: JobApplication;
  user: any;
  onRefresh: () => Promise<void>;
}

const JobPeopleTab: React.FC<JobPeopleTabProps> = ({ job, user, onRefresh }) => {
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState('Recruiter');
  const [isSavingContact, setIsSavingContact] = useState(false);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) {
      toast.error('Contact name is required');
      return;
    }
    if (newContactEmail.trim() && !isValidEmail(newContactEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!user?.id) return;
    try {
      setIsSavingContact(true);
      const existingContacts = job.contacts || [];
      const normalizedEmail = newContactEmail.trim().toLowerCase();
      const updatedContacts = [
        ...existingContacts.filter(c => (c.email || '').toLowerCase() !== normalizedEmail),
        {
          name: newContactName.trim(),
          email: newContactEmail.trim() || undefined,
          role: newContactRole
        }
      ];

      const jobId = job.id || job._id;
      const res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: updatedContacts }),
      });
      if (res.ok) {
        toast.success('Contact added successfully!');
        setNewContactName('');
        setNewContactEmail('');
        setNewContactRole('Recruiter');
        setShowAddContactForm(false);
        await onRefresh();
      } else {
        toast.error('Failed to add contact');
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error('Failed to add contact');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactEmail: string) => {
    if (!user?.id) return;
    try {
      const existingContacts = job.contacts || [];
      const updatedContacts = existingContacts.filter(c => (c.email || '').toLowerCase() !== contactEmail.toLowerCase());

      const jobId = job.id || job._id;
      const res = await authenticatedFetchWithUserId(`/api/jobs/${jobId}`, user.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: updatedContacts }),
      });
      if (res.ok) {
        toast.success('Contact removed');
        await onRefresh();
      } else {
        toast.error('Failed to remove contact');
      }
    } catch (error) {
      console.error('Error removing contact:', error);
      toast.error('Failed to remove contact');
    }
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between flex-shrink-0">
        <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Saved Contacts</h4>
        {!showAddContactForm && (
          <button
            onClick={() => setShowAddContactForm(true)}
            className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-[11px] font-bold transition flex items-center gap-1"
          >
            <Plus size={12} /> Add Contact
          </button>
        )}
      </div>

      {showAddContactForm ? (
        <form onSubmit={handleAddContact} className="p-4 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] space-y-3 flex-shrink-0 animate-fadeIn">
          <p className="text-small font-bold text-gray-900 dark:text-white mb-2">New Contact</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={newContactName}
                onChange={e => setNewContactName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] focus:border-emerald-500 focus:outline-none dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Role</label>
              <select
                value={newContactRole}
                onChange={e => setNewContactRole(e.target.value)}
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] focus:border-emerald-500 focus:outline-none dark:text-white"
              >
                <option value="Recruiter">Recruiter</option>
                <option value="Hiring Manager">Hiring Manager</option>
                <option value="Referral">Referral / Employee</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 mb-1">Email Address</label>
              <input
                type="email"
                value={newContactEmail}
                onChange={e => setNewContactEmail(e.target.value)}
                placeholder="jane.doe@company.com"
                className="w-full text-small rounded-lg border border-gray-250 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#131810] focus:border-emerald-500 focus:outline-none dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddContactForm(false);
                setNewContactName('');
                setNewContactEmail('');
                setNewContactRole('Recruiter');
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-[11px] font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingContact || !newContactName.trim()}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold transition disabled:opacity-60"
            >
              {isSavingContact ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-3">
          {(!job.contacts || job.contacts.length === 0) ? (
            <div className="p-8 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-[#181f16]/30 text-center flex-1 flex flex-col items-center justify-center">
              <Users className="w-8 h-8 text-gray-400 dark:text-gray-600 mb-3" />
              <p className="text-small text-gray-500 dark:text-gray-400 mb-3">No contacts saved for this job yet.</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 max-w-[200px] mb-4">
                Add recruiters, hiring managers, or referrals to keep track of your network.
              </p>
              <button
                onClick={() => setShowAddContactForm(true)}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-500 text-white text-small font-bold hover:bg-emerald-600 transition"
              >
                <Plus size={14} /> Add First Contact
              </button>
            </div>
          ) : (
            job.contacts.map((contact, index) => (
              <div key={index} className="bg-gray-50/50 dark:bg-[#181f16] border border-gray-200 dark:border-white/5 rounded-xl p-4 flex items-center justify-between group">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-small font-bold text-gray-900 dark:text-white">{contact.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold">
                      {contact.role || 'Contact'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-emerald-500 transition-colors">
                        <Mail size={12} />
                        {contact.email}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Mail size={12} />
                        No email saved
                      </span>
                    )}
                    {contact.linkedin && (
                      <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-[#0077b5] transition-colors">
                        <Globe size={12} />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Remove ${contact.name} from contacts?`)) {
                      handleDeleteContact(contact.email || '');
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all"
                  title="Remove contact"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default JobPeopleTab;
