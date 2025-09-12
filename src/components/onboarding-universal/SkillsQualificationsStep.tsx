'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  X,
  Award,
  Globe,
  Star
} from 'lucide-react';

interface SkillsQualificationsStepProps {
  cvData: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SkillsQualificationsStep({ cvData, onUpdate, onNext, onBack }: SkillsQualificationsStepProps) {
  const [newSkill, setNewSkill] = useState('');
  const [newLanguage, setNewLanguage] = useState({ language: '', proficiency: 'Intermediate' });
  const [newCertificate, setNewCertificate] = useState({ name: '', issuer: '', date: '' });

  const addSkill = () => {
    if (newSkill.trim()) {
      const skill = {
        name: newSkill.trim(),
        level: 'Intermediate',
        keywords: []
      };
      
      onUpdate({
        skills: [...(cvData.skills || []), skill]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (index: number) => {
    const updatedSkills = [...(cvData.skills || [])];
    updatedSkills.splice(index, 1);
    onUpdate({ skills: updatedSkills });
  };

  const updateSkillLevel = (index: number, level: string) => {
    const updatedSkills = [...(cvData.skills || [])];
    updatedSkills[index] = { ...updatedSkills[index], level };
    onUpdate({ skills: updatedSkills });
  };

  const addLanguage = () => {
    if (newLanguage.language.trim()) {
      const language = {
        language: newLanguage.language.trim(),
        fluency: newLanguage.proficiency
      };
      
      onUpdate({
        languages: [...(cvData.languages || []), language]
      });
      setNewLanguage({ language: '', proficiency: 'Intermediate' });
    }
  };

  const removeLanguage = (index: number) => {
    const updatedLanguages = [...(cvData.languages || [])];
    updatedLanguages.splice(index, 1);
    onUpdate({ languages: updatedLanguages });
  };

  const addCertificate = () => {
    if (newCertificate.name.trim() && newCertificate.issuer.trim()) {
      const certificate = {
        name: newCertificate.name.trim(),
        issuer: newCertificate.issuer.trim(),
        date: newCertificate.date
      };
      
      onUpdate({
        certificates: [...(cvData.certificates || []), certificate]
      });
      setNewCertificate({ name: '', issuer: '', date: '' });
    }
  };

  const removeCertificate = (index: number) => {
    const updatedCertificates = [...(cvData.certificates || [])];
    updatedCertificates.splice(index, 1);
    onUpdate({ certificates: updatedCertificates });
  };

  const proficiencyLevels = [
    { value: 'Beginner', label: 'Beginner', color: 'bg-red-500' },
    { value: 'Intermediate', label: 'Intermediate', color: 'bg-yellow-500' },
    { value: 'Advanced', label: 'Advanced', color: 'bg-blue-500' },
    { value: 'Expert', label: 'Expert', color: 'bg-green-500' }
  ];

  const languageLevels = [
    { value: 'Elementary', label: 'Elementary' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
    { value: 'Fluent', label: 'Fluent' },
    { value: 'Native', label: 'Native' }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 px-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Skills & Qualifications
          </h2>
          <p className="text-xl text-white/60">
            Highlight your key skills, languages, and certifications
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Skills Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Award size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Skills</h3>
            </div>

            {/* Add Skill Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                placeholder="e.g., JavaScript, Project Management, Photoshop"
              />
              <button
                onClick={addSkill}
                disabled={!newSkill.trim()}
                className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </div>

            {/* Skills List */}
            <div className="space-y-3">
              {(cvData.skills || []).map((skill: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{skill.name}</span>
                    <select
                      value={skill.level}
                      onChange={(e) => updateSkillLevel(index, e.target.value)}
                      className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                    >
                      {proficiencyLevels.map((level) => (
                        <option key={level.value} value={level.value} className="bg-gray-800">
                          {level.label}
                        </option>
                      ))}
                    </select>
                    <div className={`w-3 h-3 rounded-full ${proficiencyLevels.find(l => l.value === skill.level)?.color || 'bg-gray-500'}`} />
                  </div>
                  <button
                    onClick={() => removeSkill(index)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Languages Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                <Globe size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Languages</h3>
            </div>

            {/* Add Language Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newLanguage.language}
                onChange={(e) => setNewLanguage({ ...newLanguage, language: e.target.value })}
                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                placeholder="e.g., Spanish, French, Mandarin"
              />
              <select
                value={newLanguage.proficiency}
                onChange={(e) => setNewLanguage({ ...newLanguage, proficiency: e.target.value })}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50"
              >
                {languageLevels.map((level) => (
                  <option key={level.value} value={level.value} className="bg-gray-800">
                    {level.label}
                  </option>
                ))}
              </select>
              <button
                onClick={addLanguage}
                disabled={!newLanguage.language.trim()}
                className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </div>

            {/* Languages List */}
            <div className="space-y-3">
              {(cvData.languages || []).map((language: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium">{language.language}</span>
                    <span className="text-white/60 text-sm">({language.fluency})</span>
                  </div>
                  <button
                    onClick={() => removeLanguage(index)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Certificates Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <Star size={20} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Certificates</h3>
            </div>

            {/* Add Certificate Input */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <input
                type="text"
                value={newCertificate.name}
                onChange={(e) => setNewCertificate({ ...newCertificate, name: e.target.value })}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                placeholder="Certificate name"
              />
              <input
                type="text"
                value={newCertificate.issuer}
                onChange={(e) => setNewCertificate({ ...newCertificate, issuer: e.target.value })}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                placeholder="Issuing organization"
              />
              <div className="flex gap-2">
                <input
                  type="month"
                  value={newCertificate.date}
                  onChange={(e) => setNewCertificate({ ...newCertificate, date: e.target.value })}
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                />
                <button
                  onClick={addCertificate}
                  disabled={!newCertificate.name.trim() || !newCertificate.issuer.trim()}
                  className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Certificates List */}
            <div className="space-y-3">
              {(cvData.certificates || []).map((certificate: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                  <div>
                    <div className="text-white font-medium">{certificate.name}</div>
                    <div className="text-white/60 text-sm">{certificate.issuer}</div>
                    {certificate.date && (
                      <div className="text-white/40 text-xs">{certificate.date}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeCertificate(index)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <button
            onClick={onNext}
            className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-600 text-black font-medium rounded-lg transition-colors"
          >
            Next
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
