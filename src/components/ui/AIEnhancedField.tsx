'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import AIIcon from './AIIcon';
import { useUserPlan } from '@/lib/hooks/useUserPlan';
import { AIAssistantService } from '@/lib/services/aiAssistantService';

interface AIEnhancedFieldProps {
  type: 'input' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
  className?: string;
  fieldType?: 'summary' | 'description' | 'highlights' | 'achievements' | 'skills' | 'projects';
  onAIAssist?: () => void;
  disabled?: boolean;
  cvData?: any;
  jobData?: any;
}

const AIEnhancedField: React.FC<AIEnhancedFieldProps> = ({
  type,
  value,
  onChange,
  placeholder,
  label,
  rows = 3,
  className = '',
  fieldType = 'description',
  onAIAssist,
  disabled = false,
  cvData,
  jobData
}) => {
  const { hasAI } = useUserPlan();
  const [isAILoading, setIsAILoading] = useState(false);

  const handleAIClick = async () => {
    if (!hasAI) {
      // Show upgrade prompt
      window.open('/dashboard/settings?tab=membership', '_blank');
      return;
    }

    if (isAILoading) return;

    setIsAILoading(true);
    
    try {
      let improvedContent = '';
      
      switch (fieldType) {
        case 'summary':
          improvedContent = await AIAssistantService.improveSummary(value, cvData, jobData);
          break;
        case 'description':
          improvedContent = await AIAssistantService.improveDescription(value, cvData, jobData);
          break;
        case 'highlights':
          improvedContent = await AIAssistantService.improveHighlights(value, cvData, jobData);
          break;
        case 'achievements':
          improvedContent = await AIAssistantService.improveAchievements(value, cvData, jobData);
          break;
        case 'skills':
          improvedContent = await AIAssistantService.improveSkills(value, cvData, jobData);
          break;
        case 'projects':
          improvedContent = await AIAssistantService.improveProjectDescription(value, cvData, jobData);
          break;
        default:
          improvedContent = await AIAssistantService.improveContent(value, fieldType, cvData, jobData);
      }

      if (improvedContent) {
        onChange(improvedContent);
      }
    } catch (error) {
      console.error('AI enhancement failed:', error);
      // Show error toast or notification
    } finally {
      setIsAILoading(false);
    }
  };

  const getAITooltip = () => {
    if (!hasAI) {
      return 'Upgrade to PRO for AI assistance';
    }
    
    if (isAILoading) {
      return 'AI is improving your content...';
    }
    
    switch (fieldType) {
      case 'summary':
        return 'AI can help optimize your professional summary';
      case 'description':
        return 'AI can enhance your descriptions';
      case 'highlights':
        return 'AI can improve your bullet points';
      case 'achievements':
        return 'AI can quantify your achievements';
      case 'skills':
        return 'AI can suggest relevant skills';
      case 'projects':
        return 'AI can enhance project descriptions';
      default:
        return 'AI assistance available';
    }
  };

  const renderField = () => {
    const baseClasses = `
      w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 
      focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent transition-colors
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${className}
    `;

    if (type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${baseClasses} resize-none`}
          disabled={disabled}
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={baseClasses}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-300">
            {label}
          </label>
          <div className="flex items-center space-x-2">
            <AIIcon
              size="sm"
              variant={isAILoading ? "default" : "sparkle"}
              onClick={handleAIClick}
              disabled={disabled || isAILoading}
              tooltip={getAITooltip()}
              className={`transition-all duration-200 ${isAILoading ? 'animate-pulse' : ''}`}
            />
            {!hasAI && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-lime-400 bg-lime-900/20 px-2 py-1 rounded"
              >
                PRO
              </motion.div>
            )}
          </div>
        </div>
      )}
      
      <div className="relative">
        {renderField()}
        
        {/* AI Icon for fields without labels */}
        {!label && (
          <div className="absolute top-2 right-2">
            <AIIcon
              size="sm"
              variant={isAILoading ? "default" : "sparkle"}
              onClick={handleAIClick}
              disabled={disabled || isAILoading}
              tooltip={getAITooltip()}
              className={isAILoading ? 'animate-pulse' : ''}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AIEnhancedField;
