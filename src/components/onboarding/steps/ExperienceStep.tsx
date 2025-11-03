'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, 
  GraduationCap, 
  FolderOpen, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  MapPin,
  Building,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  X
} from 'lucide-react';

interface WorkExperience {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent?: boolean;
  description: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string;
  url: string;
  startDate: string;
  endDate: string;
}

interface ExperienceData {
  workExperience: WorkExperience[];
  education: Education[];
  projects: Project[];
}

interface ExperienceStepProps {
  data: ExperienceData;
  onNext: (data: Partial<ExperienceData>) => void;
  onPrevious: () => void;
}

const ExperienceStep: React.FC<ExperienceStepProps> = ({
  data,
  onNext,
  onPrevious
}) => {
  const [activeTab, setActiveTab] = useState<'work' | 'education' | 'projects'>('work');
  const [formData, setFormData] = useState<ExperienceData>(data);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<WorkExperience | Education | Project>({} as WorkExperience | Education | Project);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleAddItem = () => {
    const itemTemplate = activeTab === 'work' ? {
      id: generateId(),
      jobTitle: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: ''
    } : activeTab === 'education' ? {
      id: generateId(),
      degree: '',
      institution: '',
      location: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: ''
    } : {
      id: generateId(),
      name: '',
      description: '',
      technologies: '',
      url: '',
      startDate: '',
      endDate: ''
    };

    setNewItem(itemTemplate);
    setShowAddForm(true);
  };

  const handleSaveItem = () => {
    if (activeTab === 'work') {
      setFormData((prev: ExperienceData) => ({
        ...prev,
        workExperience: [...prev.workExperience, newItem as WorkExperience]
      }));
    } else if (activeTab === 'education') {
      setFormData((prev: ExperienceData) => ({
        ...prev,
        education: [...prev.education, newItem as Education]
      }));
    } else {
      setFormData((prev: ExperienceData) => ({
        ...prev,
        projects: [...prev.projects, newItem as Project]
      }));
    }
    
    setShowAddForm(false);
    setNewItem({} as WorkExperience | Education | Project);
  };

  const handleDeleteItem = (id: string) => {
    if (activeTab === 'work') {
      setFormData((prev: ExperienceData) => ({
        ...prev,
        workExperience: prev.workExperience.filter(item => item.id !== id)
      }));
    } else if (activeTab === 'education') {
      setFormData((prev: ExperienceData) => ({
        ...prev,
        education: prev.education.filter(item => item.id !== id)
      }));
    } else {
      setFormData((prev: ExperienceData) => ({
        ...prev,
        projects: prev.projects.filter(item => item.id !== id)
      }));
    }
  };

  const handleNext = () => {
    onNext(formData);
  };

  const renderWorkExperienceForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Job Title *
          </label>
          <input
            type="text"
            value={(newItem as WorkExperience).jobTitle || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as WorkExperience), jobTitle: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., Senior Software Engineer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Company *
          </label>
          <input
            type="text"
            value={(newItem as WorkExperience).company || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as WorkExperience), company: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., Google"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Location
        </label>
        <input
          type="text"
          value={(newItem as WorkExperience).location || ''}
          onChange={(e) => setNewItem((prev) => ({ ...(prev as WorkExperience), location: e.target.value }) as WorkExperience | Education | Project)}
          className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="e.g., San Francisco, CA"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            value={(newItem as WorkExperience | Education | Project).startDate || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as WorkExperience | Education | Project), startDate: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date
          </label>
          <div className="space-y-2">
            <input
              type="date"
              value={(newItem as WorkExperience | Education | Project).endDate || ''}
              onChange={(e) => setNewItem((prev) => ({ ...(prev as WorkExperience | Education | Project), endDate: e.target.value }) as WorkExperience | Education | Project)}
              disabled={(newItem as WorkExperience | Education).isCurrent}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={((newItem as WorkExperience | Education).isCurrent) || false}
                onChange={(e) => setNewItem((prev) => ({ 
                  ...(prev as WorkExperience), 
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? '' : (prev as WorkExperience).endDate
                }) as WorkExperience | Education | Project)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              I currently work here
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Responsibilities / Description
        </label>
        <div className="relative">
          <textarea
            value={(newItem as WorkExperience | Education | Project).description || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as WorkExperience), description: e.target.value }) as WorkExperience | Education | Project)}
            rows={4}
            className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            placeholder="Describe your key responsibilities and achievements..."
          />
          <button
            onClick={() => console.log('AI assistance for work description')}
            className="absolute top-3 right-3 p-1 text-blue-500 hover:text-blue-600 transition-colors"
            title="Let AI help improve your description"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderEducationForm = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Degree *
          </label>
          <input
            type="text"
            value={(newItem as Education).degree || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as Education), degree: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., Bachelor of Science in Computer Science"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Institution *
          </label>
          <input
            type="text"
            value={(newItem as Education).institution || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as Education), institution: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., Stanford University"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Location
        </label>
        <input
          type="text"
          value={(newItem as Education).location || ''}
          onChange={(e) => setNewItem((prev) => ({ ...(prev as Education), location: e.target.value }) as WorkExperience | Education | Project)}
          className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="e.g., Stanford, CA"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            value={(newItem as WorkExperience | Education | Project).startDate || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as WorkExperience | Education | Project), startDate: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date
          </label>
          <div className="space-y-2">
            <input
              type="date"
              value={(newItem as WorkExperience | Education | Project).endDate || ''}
              onChange={(e) => setNewItem((prev) => ({ ...(prev as WorkExperience | Education | Project), endDate: e.target.value }) as WorkExperience | Education | Project)}
              disabled={(newItem as WorkExperience | Education).isCurrent}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={((newItem as WorkExperience | Education).isCurrent) || false}
                onChange={(e) => setNewItem((prev) => ({ 
                  ...(prev as Education), 
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? '' : (prev as Education).endDate
                }) as WorkExperience | Education | Project)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Currently studying
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={(newItem as Education).description || ''}
          onChange={(e) => setNewItem((prev) => ({ ...(prev as Education), description: e.target.value }) as WorkExperience | Education | Project)}
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          placeholder="Relevant coursework, achievements, or activities..."
        />
      </div>
    </div>
  );

  const renderProjectForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project Name *
        </label>
          <input
            type="text"
            value={(newItem as Project).name || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as Project), name: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., E-commerce Platform"
          />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description *
        </label>
          <textarea
            value={(newItem as WorkExperience | Education | Project).description || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as Project), description: e.target.value }) as WorkExperience | Education | Project)}
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            placeholder="Describe what the project does and your role..."
          />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Technologies Used
        </label>
          <input
            type="text"
            value={(newItem as Project).technologies || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as Project), technologies: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="e.g., React, Node.js, MongoDB"
          />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project URL
        </label>
        <input
          type="url"
          value={(newItem as Project).url || ''}
          onChange={(e) => setNewItem((prev) => ({ ...(prev as Project), url: e.target.value }) as WorkExperience | Education | Project)}
          className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder="https://yourproject.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={(newItem as WorkExperience | Education | Project).startDate || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as WorkExperience | Education | Project), startDate: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={(newItem as Project).endDate || ''}
            onChange={(e) => setNewItem((prev) => ({ ...(prev as Project), endDate: e.target.value }) as WorkExperience | Education | Project)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>
    </div>
  );

  const renderItemCard = (item: any, type: 'work' | 'education' | 'projects') => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {type === 'work' && <Building className="h-4 w-4 text-blue-500" />}
            {type === 'education' && <GraduationCap className="h-4 w-4 text-green-500" />}
            {type === 'projects' && <FolderOpen className="h-4 w-4 text-purple-500" />}
            <h4 className="font-medium text-gray-900 dark:text-white">
              {type === 'work' ? item.jobTitle : type === 'education' ? item.degree : item.name}
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {type === 'work' ? item.company : type === 'education' ? item.institution : item.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {item.startDate} - {item.isCurrent ? 'Present' : item.endDate || 'Present'}
            </div>
            {item.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.location}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditingItem(item.id)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteItem(item.id)}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl"
    >
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Step 2: Detail your experience and education.
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          This is the most important part of your profile. Add your work history, 
          academic background, and notable projects.
        </p>
      </div>

      {/* Tabbed Interface */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {[
            { id: 'work', label: 'Work Experience', icon: Briefcase },
            { id: 'education', label: 'Education', icon: GraduationCap },
            { id: 'projects', label: 'Projects', icon: FolderOpen }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Items List */}
        <div className="space-y-4">
          {activeTab === 'work' && formData.workExperience.map(item => renderItemCard(item, 'work'))}
          {activeTab === 'education' && formData.education.map(item => renderItemCard(item, 'education'))}
          {activeTab === 'projects' && formData.projects.map(item => renderItemCard(item, 'projects'))}
          
          {((activeTab === 'work' && formData.workExperience.length === 0) ||
            (activeTab === 'education' && formData.education.length === 0) ||
            (activeTab === 'projects' && formData.projects.length === 0)) && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'work' && <Briefcase className="h-8 w-8" />}
                {activeTab === 'education' && <GraduationCap className="h-8 w-8" />}
                {activeTab === 'projects' && <FolderOpen className="h-8 w-8" />}
              </div>
              <p className="text-lg font-medium mb-2">
                No {activeTab === 'work' ? 'work experience' : activeTab === 'education' ? 'education' : 'projects'} added yet.
              </p>
              <p className="text-sm">Click the button below to get started.</p>
            </div>
          )}
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                  Add {activeTab === 'work' ? 'Work Experience' : activeTab === 'education' ? 'Education' : 'Project'}
                </h4>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItem({} as WorkExperience | Education | Project);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {activeTab === 'work' && renderWorkExperienceForm()}
              {activeTab === 'education' && renderEducationForm()}
              {activeTab === 'projects' && renderProjectForm()}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItem({} as WorkExperience | Education | Project);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Button */}
        {!showAddForm && (
          <motion.button
            onClick={handleAddItem}
            className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-all flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="h-5 w-5" />
            Add {activeTab === 'work' ? 'Work Experience' : activeTab === 'education' ? 'Education' : 'Project'}
          </motion.button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <motion.button
          onClick={onPrevious}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </motion.button>
        
        <motion.button
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Next Step
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ExperienceStep;
