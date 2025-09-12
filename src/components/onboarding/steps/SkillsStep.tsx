'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, 
  Plus, 
  X, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Languages,
  Heart,
  Code,
  Trash2
} from 'lucide-react';

interface Language {
  id: string;
  language: string;
  proficiency: 'Native' | 'Fluent' | 'Conversational' | 'Basic';
}

interface SkillsData {
  skills: string[];
  languages: Language[];
  achievements: string;
  interests: string[];
}

interface SkillsStepProps {
  data: SkillsData;
  onNext: (data: Partial<SkillsData>) => void;
  onPrevious: () => void;
}

const SkillsStep: React.FC<SkillsStepProps> = ({
  data,
  onNext,
  onPrevious
}) => {
  const [formData, setFormData] = useState<SkillsData>(data);
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [newLanguage, setNewLanguage] = useState<Language>({
    id: '',
    language: '',
    proficiency: 'Basic'
  });
  const [showAddLanguage, setShowAddLanguage] = useState(false);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  const handleAddLanguage = () => {
    if (newLanguage.language.trim()) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, { ...newLanguage, id: generateId() }]
      }));
      setNewLanguage({ id: '', language: '', proficiency: 'Basic' });
      setShowAddLanguage(false);
    }
  };

  const handleRemoveLanguage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l.id !== id)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'skill' | 'interest') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'skill') {
        handleAddSkill();
      } else {
        handleAddInterest();
      }
    }
  };

  const handleNext = () => {
    onNext(formData);
  };

  const handleAIClick = () => {
    // TODO: Implement AI assistance for achievements
    console.log('AI assistance for achievements clicked');
  };

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
          Step 3: Showcase your unique abilities.
        </h3>
        <p className="text-gray-600 dark:text-gray-300">
          Highlight the skills, languages, and accomplishments that make you stand out from the crowd.
        </p>
      </div>

      <div className="space-y-8">
        {/* Skills Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Code className="h-5 w-5 text-blue-500" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Skills
            </h4>
          </div>
          
          <div className="space-y-4">
            {/* Skills Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'skill')}
                placeholder="e.g., Python, Project Management, Figma"
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                onClick={handleAddSkill}
                disabled={!newSkill.trim()}
                className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {/* Skills Tags */}
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, index) => (
                <motion.div
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              e.g., Python, Project Management, Figma
            </p>
          </div>
        </div>

        {/* Languages Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Languages className="h-5 w-5 text-green-500" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Languages
            </h4>
          </div>

          <div className="space-y-4">
            {/* Languages List */}
            {formData.languages.length > 0 && (
              <div className="space-y-2">
                {formData.languages.map((lang) => (
                  <motion.div
                    key={lang.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {lang.language}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({lang.proficiency})
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveLanguage(lang.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Add Language Form */}
            <AnimatePresence>
              {showAddLanguage ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Language
                        </label>
                        <input
                          type="text"
                          value={newLanguage.language}
                          onChange={(e) => setNewLanguage(prev => ({ ...prev, language: e.target.value }))}
                          placeholder="e.g., Spanish, French"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Proficiency
                        </label>
                        <select
                          value={newLanguage.proficiency}
                          onChange={(e) => setNewLanguage(prev => ({ ...prev, proficiency: e.target.value as any }))}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="Basic">Basic</option>
                          <option value="Conversational">Conversational</option>
                          <option value="Fluent">Fluent</option>
                          <option value="Native">Native</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowAddLanguage(false);
                          setNewLanguage({ id: '', language: '', proficiency: 'Basic' });
                        }}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddLanguage}
                        disabled={!newLanguage.language.trim()}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        Add Language
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setShowAddLanguage(true)}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add Language
                </button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Achievements Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-purple-500" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Achievements
            </h4>
          </div>
          
          <div className="relative">
            <textarea
              value={formData.achievements}
              onChange={(e) => setFormData(prev => ({ ...prev, achievements: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 pr-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              placeholder="List your key achievements, awards, certifications, or notable accomplishments..."
            />
            <button
              onClick={handleAIClick}
              className="absolute top-3 right-3 p-1 text-blue-500 hover:text-blue-600 transition-colors"
              title="Let AI help you frame your achievements powerfully"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Interests Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-red-500" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Interests
            </h4>
          </div>
          
          <div className="space-y-4">
            {/* Interests Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'interest')}
                placeholder="e.g., Photography, Hiking, Reading"
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <button
                onClick={handleAddInterest}
                disabled={!newInterest.trim()}
                className="px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {/* Interests Tags */}
            <div className="flex flex-wrap gap-2">
              {formData.interests.map((interest, index) => (
                <motion.div
                  key={interest}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm"
                >
                  <span>{interest}</span>
                  <button
                    onClick={() => handleRemoveInterest(interest)}
                    className="text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add personal interests that showcase your personality and hobbies.
            </p>
          </div>
        </div>
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

export default SkillsStep;
