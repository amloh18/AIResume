'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, User, Mail, Linkedin, Building, FileText, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface Advocate {
  id?: string;
  name: string;
  email?: string;
  linkedinUrl?: string;
  relation: 'colleague' | 'friend' | 'alumni' | 'mentor' | 'other';
  company?: string;
  notes?: string;
}

interface AdvocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  advocate?: Advocate | null;
  onSave: (advocate: Advocate) => void;
}

const AdvocateModal: React.FC<AdvocateModalProps> = ({
  isOpen,
  onClose,
  advocate,
  onSave
}) => {
  const [formData, setFormData] = useState<Advocate>({
    name: '',
    email: '',
    linkedinUrl: '',
    relation: 'other',
    company: '',
    notes: ''
  });

  useEffect(() => {
    if (advocate) {
      setFormData(advocate);
    } else {
      setFormData({
        name: '',
        email: '',
        linkedinUrl: '',
        relation: 'other',
        company: '',
        notes: ''
      });
    }
  }, [advocate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    onSave(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      linkedinUrl: '',
      relation: 'other',
      company: '',
      notes: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {advocate ? 'Edit Advocate' : 'Add Advocate'}
          </DialogTitle>
          <DialogDescription>
            Track referral contacts and manage your network
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn URL
              </label>
              <input
                type="url"
                value={formData.linkedinUrl}
                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Relation
              </label>
              <select
                value={formData.relation}
                onChange={(e) => setFormData({ ...formData, relation: e.target.value as Advocate['relation'] })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="colleague">Colleague</option>
                <option value="friend">Friend</option>
                <option value="alumni">Alumni</option>
                <option value="mentor">Mentor</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 resize-none"
              placeholder="Additional notes about this contact..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-lime-500 hover:bg-lime-600 text-black"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdvocateModal;

