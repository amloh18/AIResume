'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CVStudioEditorProps {
  zoom: number;
  isPreviewMode: boolean;
  selectedCV: string | null;
  linkedJob: any;
  onDataChange: () => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
  onContentChange?: (content: string, section?: string) => void;
}

// Mock CV data structure
const defaultCVData = {
  personal_info: {
    name: "Andrew O'Sullivan",
    title: "Product Manager",
    phone: "+01 11111155",
    email: "andrew@sulli.com",
    address: "4 Noel Street, London W1F 8GB England",
    linkedin: "in/andrewosulvian",
    photo: "https://placehold.co/400x400/EFEFEF/333333?text=Profile"
  },
  profile: "Experienced Product Manager with a proven track record in the development and management of products throughout their lifecycle. Passionate, creative, and results-oriented. Skilled in team leadership and collaboration with cross-functional teams. Enthusiastic about designing innovative solutions that enhance customer satisfaction.",
  experience: [
    {
      id: 'work1',
      role: "Product Manager",
      company: "Technite GmbH",
      start_date: "08/2018",
      end_date: "07/2023",
      location: "Berlin, Germany",
      achievements: [
        "Led a cross-functional team of 10 people in the development of a new product line, resulting in a 20% increase in revenue.",
        "Conducted market analysis and competitive studies to identify new product opportunities and expand the product portfolio.",
        "Successfully launched two new products in the market, leading to a 15% increase in market share."
      ]
    },
    {
      id: 'work2',
      role: "Product Specialist",
      company: "Solutions Inc.",
      start_date: "04/2015",
      end_date: "07/2018",
      location: "Munich, Germany",
      achievements: [
        "Developed and implemented a product strategy for the European market, resulting in a 25% revenue growth.",
        "Conducted training sessions and presentations for customers and sales teams to enhance product knowledge."
      ]
    }
  ],
  education: [
    {
      id: 'edu1',
      degree: "Master of Business Administration (MBA)",
      field: "Business Administration",
      institution: "University",
      location: "Munich, Germany",
      start_date: "08/2013",
      end_date: "07/2015",
      achievements: []
    },
    {
      id: 'edu2',
      degree: "Bachelor of Engineering in Information Technology",
      field: "Information Technology",
      institution: "Technical University",
      location: "Vienna, Austria",
      start_date: "09/2009",
      end_date: "07/2013",
      achievements: []
    }
  ],
  skills: [
    { id: 'skill1', name: "Product Development", rating: 5, content: "Expert in managing the entire product lifecycle from ideation to launch." },
    { id: 'skill2', name: "Team Leadership", rating: 5, content: "Proven ability to lead and motivate cross-functional teams." },
    { id: 'skill3', name: "Market Research", rating: 4, content: "Skilled in gathering and analyzing customer feedback and market data." },
    { id: 'skill4', name: "Agile & Scrum", rating: 5, content: "Certified Scrum Master with experience in agile development." }
  ],
  languages: [
    { id: 'lang1', name: 'German', proficiency: "fluent", rating: 5 },
    { id: 'lang2', name: 'English', proficiency: "native", rating: 5 },
    { id: 'lang3', name: 'Spanish', proficiency: "intermediate", rating: 3 }
  ],
  sectionsOrder: ['personal_info', 'profile', 'experience', 'education', 'skills', 'languages']
};

// Enhanced Editable Field Component
const EditableField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  tag?: 'div' | 'h1' | 'h2' | 'h3' | 'span' | 'textarea';
  multiline?: boolean;
  isPreview?: boolean;
  style?: React.CSSProperties;
}> = ({ value, onChange, placeholder, className = '', tag: Tag = 'div', multiline = false, isPreview = false, style }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const startEditing = () => {
    if (!isPreview) {
      setIsEditing(true);
      setCurrentValue(value);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange(currentValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (!multiline || (multiline && !e.shiftKey))) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setCurrentValue(value);
      handleBlur();
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline && inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }
  }, [isEditing, multiline]);

  if (isEditing) {
    if (multiline || Tag === 'textarea') {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={currentValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`bg-yellow-100 border border-yellow-400 rounded-md p-1 w-full resize-none overflow-hidden relative z-30 ${className}`}
          style={style}
          autoFocus
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={currentValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-yellow-100 border border-yellow-400 rounded-md p-1 w-full relative z-30 ${className}`}
        style={style}
        autoFocus
      />
    );
  }

  const DisplayTag = (Tag === 'textarea' || multiline) ? 'div' : Tag;
  return (
    <DisplayTag
      className={`${!isPreview ? 'cursor-pointer hover:bg-gray-100' : ''} p-1 rounded-md whitespace-pre-wrap ${className}`}
      onClick={startEditing}
      style={style}
    >
      {value || <span className="text-gray-400">{placeholder}</span>}
    </DisplayTag>
  );
};

// Enhanced Section Component
const Section: React.FC<{
  id: string;
  title: string;
  children: React.ReactNode;
  isPreview?: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}> = ({ 
  id, 
  title, 
  children, 
  isPreview = false, 
  onDelete, 
  onDuplicate, 
  onMoveUp, 
  onMoveDown, 
  isFirst = false, 
  isLast = false 
}) => {
  return (
    <div className="relative group/section mb-6 border-2 border-dashed border-transparent hover:border-gray-200 rounded-lg p-1 transition-all duration-200">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-gray-800 border-b-2 border-gray-300 pb-1">
          {title}
        </h2>
        
        {!isPreview && (
          <div className="flex items-center space-x-2 opacity-0 group-hover/section:opacity-100 transition-opacity relative z-20">
            {/* Move Up Button */}
            {!isFirst && onMoveUp && (
              <button
                onClick={onMoveUp}
                className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
                title="Move Up"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {/* Move Down Button */}
            {!isLast && onMoveDown && (
              <button
                onClick={onMoveDown}
                className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
                title="Move Down"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            <button
              onClick={onDuplicate}
              className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
              title="Duplicate Section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                <path d="M3 7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
              title="Delete Section"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Section Content */}
      <div className="section-content">
        {children}
      </div>
    </div>
  );
};

// Enhanced Experience Item Component
const ExperienceItem: React.FC<{
  item: any;
  isPreview?: boolean;
  onUpdate: (item: any) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}> = ({ item, isPreview = false, onUpdate, onDelete, onDuplicate }) => {
  const handleUpdate = (field: string, value: any) => {
    onUpdate({ ...item, [field]: value });
  };

  const handleAchievementChange = (index: number, value: string) => {
    const newAchievements = [...item.achievements];
    newAchievements[index] = value;
    onUpdate({ ...item, achievements: newAchievements });
  };

  const addAchievement = () => {
    onUpdate({
      ...item,
      achievements: [...item.achievements, 'New achievement.']
    });
  };

  const removeAchievement = (index: number) => {
    const newAchievements = item.achievements.filter((_: any, i: number) => i !== index);
    onUpdate({ ...item, achievements: newAchievements });
  };

  return (
    <div className="mb-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group/item">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <EditableField
            value={item.role}
            onChange={(value) => handleUpdate('role', value)}
            placeholder="Job Title"
            className="font-semibold text-gray-800"
            isPreview={isPreview}
          />
          <EditableField
            value={item.company}
            onChange={(value) => handleUpdate('company', value)}
            placeholder="Company"
            className="text-gray-600 italic"
            isPreview={isPreview}
          />
        </div>
        <div className="text-right ml-4">
          <EditableField
            value={`${item.start_date} - ${item.end_date}`}
            onChange={(value) => {
              const [start, end] = value.split(' - ');
              handleUpdate('start_date', start || '');
              handleUpdate('end_date', end || '');
            }}
            placeholder="Date Range"
            className="text-gray-600 text-sm"
            isPreview={isPreview}
          />
          <EditableField
            value={item.location}
            onChange={(value) => handleUpdate('location', value)}
            placeholder="Location"
            className="text-gray-600 text-sm"
            isPreview={isPreview}
          />
        </div>
        
        {/* Item Actions */}
        {!isPreview && (
          <div className="flex items-center space-x-1 opacity-0 group-hover/item:opacity-100 transition-opacity ml-2 relative z-20">
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
                title="Duplicate Experience"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
                  <path d="M3 7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-200 relative z-20"
                title="Delete Experience"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
      
      <ul className="list-disc list-outside pl-5 space-y-1">
        {item.achievements.map((achievement: string, index: number) => (
          <li key={index} className="relative group/bullet">
            <EditableField
              value={achievement}
              onChange={(value) => handleAchievementChange(index, value)}
              placeholder="Achievement description..."
              multiline={true}
              className="text-gray-700"
              isPreview={isPreview}
            />
            {!isPreview && (
              <button
                onClick={() => removeAchievement(index)}
                className="absolute right-0 top-0 text-red-400 hover:text-red-600 opacity-0 group-hover/bullet:opacity-100 text-xs relative z-20"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      
      {!isPreview && (
        <button
          onClick={addAchievement}
          className="mt-2 text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1 relative z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
          Add Achievement
        </button>
      )}
    </div>
  );
};

const CVStudioEditor: React.FC<CVStudioEditorProps> = ({
  zoom,
  isPreviewMode,
  selectedCV,
  linkedJob,
  onDataChange,
  currentPage,
  onPageChange,
  totalPages
}) => {
  const [cvData, setCVData] = useState(defaultCVData);
  const [history, setHistory] = useState<any[]>([defaultCVData]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const handleDataUpdate = useCallback((section: string, data: any) => {
    const newData = {
      ...cvData,
      [section]: data
    };
    setCVData(newData);
    
    // Add to history for undo/redo functionality
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    onDataChange();
  }, [cvData, history, historyIndex, onDataChange]);

  const handleExperienceUpdate = useCallback((index: number, updatedItem: any) => {
    const newExperience = [...cvData.experience];
    newExperience[index] = updatedItem;
    handleDataUpdate('experience', newExperience);
  }, [cvData.experience, handleDataUpdate]);

  const addExperience = useCallback(() => {
    const newExperience = {
      id: `work_${Date.now()}`,
      role: "New Role",
      company: "Company Name",
      start_date: "MM/YYYY",
      end_date: "MM/YYYY",
      location: "Location",
      achievements: ["New achievement."]
    };
    handleDataUpdate('experience', [...cvData.experience, newExperience]);
  }, [cvData.experience, handleDataUpdate]);

  const removeExperience = useCallback((index: number) => {
    const newExperience = cvData.experience.filter((_, i) => i !== index);
    handleDataUpdate('experience', newExperience);
  }, [cvData.experience, handleDataUpdate]);

  const duplicateExperience = useCallback((index: number) => {
    const experienceToDuplicate = cvData.experience[index];
    const duplicatedExperience = {
      ...experienceToDuplicate,
      id: `work_${Date.now()}`,
      role: `${experienceToDuplicate.role} (Copy)`,
      company: `${experienceToDuplicate.company} (Copy)`
    };
    const newExperience = [...cvData.experience];
    newExperience.splice(index + 1, 0, duplicatedExperience);
    handleDataUpdate('experience', newExperience);
  }, [cvData.experience, handleDataUpdate]);

  const moveSection = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...cvData.sectionsOrder];
    const [movedSection] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedSection);
    handleDataUpdate('sectionsOrder', newOrder);
  }, [cvData.sectionsOrder, handleDataUpdate]);

  const renderSection = (sectionId: string, index: number) => {
    const isFirst = index === 0;
    const isLast = index === cvData.sectionsOrder.length - 1;

    switch (sectionId) {
      case 'personal_info':
        return (
          <Section
            key={sectionId}
            id={sectionId}
            title="Contact Information"
            isPreview={isPreviewMode}
            onDelete={() => console.log('Delete personal info')}
            onDuplicate={() => console.log('Duplicate personal info')}
            onMoveUp={!isFirst ? () => moveSection(index, index - 1) : undefined}
            onMoveDown={!isLast ? () => moveSection(index, index + 1) : undefined}
            isFirst={isFirst}
            isLast={isLast}
          >
            <div className="text-center mb-6">
              <EditableField
                value={cvData.personal_info.name}
                onChange={(value) => handleDataUpdate('personal_info', { ...cvData.personal_info, name: value })}
                placeholder="Your Name"
                tag="h1"
                className="text-3xl font-bold text-gray-800 mb-2"
                isPreview={isPreviewMode}
              />
              <EditableField
                value={cvData.personal_info.title}
                onChange={(value) => handleDataUpdate('personal_info', { ...cvData.personal_info, title: value })}
                placeholder="Your Title"
                tag="h2"
                className="text-xl text-gray-600 mb-4"
                isPreview={isPreviewMode}
              />
              <div className="flex justify-center items-center flex-wrap gap-x-4 gap-y-1 text-gray-600">
                <EditableField
                  value={cvData.personal_info.phone}
                  onChange={(value) => handleDataUpdate('personal_info', { ...cvData.personal_info, phone: value })}
                  placeholder="Phone"
                  isPreview={isPreviewMode}
                />
                <span>|</span>
                <EditableField
                  value={cvData.personal_info.email}
                  onChange={(value) => handleDataUpdate('personal_info', { ...cvData.personal_info, email: value })}
                  placeholder="Email"
                  isPreview={isPreviewMode}
                />
                <span>|</span>
                <EditableField
                  value={cvData.personal_info.address}
                  onChange={(value) => handleDataUpdate('personal_info', { ...cvData.personal_info, address: value })}
                  placeholder="Address"
                  isPreview={isPreviewMode}
                />
              </div>
            </div>
          </Section>
        );

      case 'profile':
        return (
          <Section
            key={sectionId}
            id={sectionId}
            title="Professional Summary"
            isPreview={isPreviewMode}
            onDelete={() => console.log('Delete profile')}
            onDuplicate={() => console.log('Duplicate profile')}
            onMoveUp={!isFirst ? () => moveSection(index, index - 1) : undefined}
            onMoveDown={!isLast ? () => moveSection(index, index + 1) : undefined}
            isFirst={isFirst}
            isLast={isLast}
          >
            <EditableField
              value={cvData.profile}
              onChange={(value) => handleDataUpdate('profile', value)}
              placeholder="A brief professional summary..."
              multiline={true}
              className="text-gray-700 leading-relaxed"
              isPreview={isPreviewMode}
            />
          </Section>
        );

      case 'experience':
        return (
          <Section
            key={sectionId}
            id={sectionId}
            title="Professional Experience"
            isPreview={isPreviewMode}
            onDelete={() => console.log('Delete experience')}
            onDuplicate={() => console.log('Duplicate experience')}
            onMoveUp={!isFirst ? () => moveSection(index, index - 1) : undefined}
            onMoveDown={!isLast ? () => moveSection(index, index + 1) : undefined}
            isFirst={isFirst}
            isLast={isLast}
          >
            {cvData.experience.map((item, expIndex) => (
              <ExperienceItem
                key={item.id}
                item={item}
                isPreview={isPreviewMode}
                onUpdate={(updatedItem) => handleExperienceUpdate(expIndex, updatedItem)}
                onDelete={() => removeExperience(expIndex)}
                onDuplicate={() => duplicateExperience(expIndex)}
              />
            ))}
            
            {!isPreviewMode && (
              <button
                onClick={addExperience}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2 relative z-20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                Add Experience
              </button>
            )}
          </Section>
        );

      case 'education':
        return (
          <Section
            key={sectionId}
            id={sectionId}
            title="Education"
            isPreview={isPreviewMode}
            onDelete={() => console.log('Delete education')}
            onDuplicate={() => console.log('Duplicate education')}
            onMoveUp={!isFirst ? () => moveSection(index, index - 1) : undefined}
            onMoveDown={!isLast ? () => moveSection(index, index + 1) : undefined}
            isFirst={isFirst}
            isLast={isLast}
          >
            {cvData.education.map((item, eduIndex) => (
              <div key={item.id} className="mb-4 p-3 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <EditableField
                      value={item.degree}
                      onChange={(value) => {
                        const newEducation = [...cvData.education];
                        newEducation[eduIndex] = { ...item, degree: value };
                        handleDataUpdate('education', newEducation);
                      }}
                      placeholder="Degree"
                      className="font-semibold text-gray-800"
                      isPreview={isPreviewMode}
                    />
                    <EditableField
                      value={item.institution}
                      onChange={(value) => {
                        const newEducation = [...cvData.education];
                        newEducation[eduIndex] = { ...item, institution: value };
                        handleDataUpdate('education', newEducation);
                      }}
                      placeholder="Institution"
                      className="text-gray-600"
                      isPreview={isPreviewMode}
                    />
                  </div>
                  <div className="text-right ml-4">
                    <EditableField
                      value={`${item.start_date} - ${item.end_date}`}
                      onChange={(value) => {
                        const [start, end] = value.split(' - ');
                        const newEducation = [...cvData.education];
                        newEducation[eduIndex] = { ...item, start_date: start || '', end_date: end || '' };
                        handleDataUpdate('education', newEducation);
                      }}
                      placeholder="Date Range"
                      className="text-gray-600 text-sm"
                      isPreview={isPreviewMode}
                    />
                  </div>
                </div>
              </div>
            ))}
          </Section>
        );

      case 'skills':
        return (
          <Section
            key={sectionId}
            id={sectionId}
            title="Skills"
            isPreview={isPreviewMode}
            onDelete={() => console.log('Delete skills')}
            onDuplicate={() => console.log('Duplicate skills')}
            onMoveUp={!isFirst ? () => moveSection(index, index - 1) : undefined}
            onMoveDown={!isLast ? () => moveSection(index, index + 1) : undefined}
            isFirst={isFirst}
            isLast={isLast}
          >
            <div className="grid grid-cols-2 gap-4">
              {cvData.skills.map((skill, skillIndex) => (
                <div key={skill.id} className="p-3 border border-gray-200 rounded-lg">
                  <EditableField
                    value={skill.name}
                    onChange={(value) => {
                      const newSkills = [...cvData.skills];
                      newSkills[skillIndex] = { ...skill, name: value };
                      handleDataUpdate('skills', newSkills);
                    }}
                    placeholder="Skill Name"
                    className="font-semibold text-gray-800 mb-1"
                    isPreview={isPreviewMode}
                  />
                  <EditableField
                    value={skill.content}
                    onChange={(value) => {
                      const newSkills = [...cvData.skills];
                      newSkills[skillIndex] = { ...skill, content: value };
                      handleDataUpdate('skills', newSkills);
                    }}
                    placeholder="Skill description"
                    multiline={true}
                    className="text-gray-600 text-sm"
                    isPreview={isPreviewMode}
                  />
                </div>
              ))}
            </div>
          </Section>
        );

      case 'languages':
        return (
          <Section
            key={sectionId}
            id={sectionId}
            title="Languages"
            isPreview={isPreviewMode}
            onDelete={() => console.log('Delete languages')}
            onDuplicate={() => console.log('Duplicate languages')}
            onMoveUp={!isFirst ? () => moveSection(index, index - 1) : undefined}
            onMoveDown={!isLast ? () => moveSection(index, index + 1) : undefined}
            isFirst={isFirst}
            isLast={isLast}
          >
            <div className="flex flex-wrap gap-2">
              {cvData.languages.map((language, langIndex) => (
                <div key={language.id} className="px-3 py-1 bg-gray-100 rounded-full">
                  <EditableField
                    value={language.name}
                    onChange={(value) => {
                      const newLanguages = [...cvData.languages];
                      newLanguages[langIndex] = { ...language, name: value };
                      handleDataUpdate('languages', newLanguages);
                    }}
                    placeholder="Language"
                    className="font-medium text-gray-800"
                    isPreview={isPreviewMode}
                  />
                  <span className="text-gray-600 text-sm ml-2">
                    ({language.proficiency})
                  </span>
                </div>
              ))}
            </div>
          </Section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-100">
      <div className="min-h-full flex justify-center p-8">
        <div className="space-y-8">
          {/* Render multiple pages */}
          {Array.from({ length: totalPages }, (_, pageIndex) => (
            <motion.div
              key={pageIndex}
              className="bg-white shadow-2xl rounded-lg overflow-hidden"
              style={{
                width: '794px', // A4 width in pixels (210mm)
                height: '1123px', // A4 height in pixels (297mm)
                transform: `scale(${zoom})`,
                transformOrigin: 'top center'
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* CV Content */}
              <div className="p-12 font-['Inter'] text-gray-800">
                {cvData.sectionsOrder.map((sectionId, index) => 
                  renderSection(sectionId, index)
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CVStudioEditor; 