'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Crown, 
  CheckCircle, 
  X, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useUserPlan } from '@/lib/hooks/useUserPlan';
import { AIAssistantService } from '@/lib/services/aiAssistantService';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Job } from '@/lib/stores/jobStore';
import ProfessionalTextField from '@/components/ui/ProfessionalTextField';

interface AIEnhancedFormFieldProps {
  type: 'input' | 'textarea';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
  className?: string;
  fieldType?: 'summary' | 'description' | 'highlights' | 'achievements' | 'skills' | 'projects' | 'position' | 'company' | 'education' | 'certificates';
  cvData?: UnifiedCVDataStructure | null;
  jobData?: Job | null;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
}

const AIEnhancedFormField: React.FC<AIEnhancedFormFieldProps> = ({
  type,
  value,
  onChange,
  placeholder,
  label,
  rows = 3,
  className = '',
  fieldType = 'description',
  cvData,
  jobData,
  disabled = false,
  required = false,
  maxLength,
  showCharacterCount = false
}) => {
  const { hasAI, userPlan } = useUserPlan();
  const [isAILoading, setIsAILoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAIClick = useCallback(async () => {
    if (!hasAI) {
      // Show upgrade modal
      const event = new CustomEvent('showUpgradeModal', {
        detail: {
          feature: 'AI Assistant',
          description: 'Get AI-powered suggestions to improve your CV content',
          benefits: [
            'Professional content optimization',
            'ATS keyword matching',
            'Quantified achievements',
            'Tailored suggestions'
          ]
        }
      });
      window.dispatchEvent(event);
      return;
    }

    if (isAILoading) return;

    setIsAILoading(true);
    setShowSuggestions(false);
    
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
        // Generate multiple suggestions
        const suggestionsList = improvedContent.split('\n').filter(s => s.trim());
        setSuggestions(suggestionsList.slice(0, 3)); // Show up to 3 suggestions
        setShowSuggestions(true);
        setSelectedSuggestion(0);
      }
    } catch (error) {
      console.error('AI enhancement failed:', error);
      // Show error toast
    } finally {
      setIsAILoading(false);
    }
  }, [hasAI, isAILoading, fieldType, value, cvData, jobData]);

  const handleApplySuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedSuggestion(null);
  };

  const handleRegenerate = () => {
    setShowSuggestions(false);
    setSelectedSuggestion(null);
    handleAIClick();
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
      case 'position':
        return 'AI can suggest better job titles';
      case 'company':
        return 'AI can help with company descriptions';
      default:
        return 'AI assistance available';
    }
  };

  // Only show AI for content-heavy fields, not for simple inputs like names, emails, etc.
  const shouldShowAI = () => {
    const contentFields = ['summary', 'description', 'highlights', 'achievements', 'skills', 'projects'];
    const simpleFields = ['name', 'email', 'phone', 'position', 'company', 'startDate', 'endDate', 'level'];
    
    // Don't show AI for simple input fields
    if (type === 'input' && !contentFields.includes(fieldType)) {
      return false;
    }
    
    // Show AI for textarea fields and content-heavy inputs
    return type === 'textarea' || contentFields.includes(fieldType);
  };

  const renderField = () => {
    const baseClasses = `
      w-full px-3 py-2 bg-white dark:bg-[#313a28] border border-gray-300 dark:border-white/10 rounded-lg 
      text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
      focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 transition-all duration-200
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${className}
    `;

    if (type === 'textarea') {
      return (
        <ProfessionalTextField
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          required={required}
          disabled={disabled}
          fieldId={`ai-field-${fieldType || 'textarea'}`}
          showFullToolbar={true}
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
        required={required}
        maxLength={maxLength}
      />
    );
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center space-x-2">
            {/* AI Button - Only show for content-heavy fields */}
            {shouldShowAI() && (
              <motion.button
                type="button"
                onClick={handleAIClick}
                disabled={disabled || isAILoading}
                className={`
                  p-1.5 rounded-lg transition-all duration-200 flex items-center space-x-1
                  ${hasAI 
                    ? 'text-lime-600 hover:text-lime-700 hover:bg-lime-50' 
                    : 'text-gray-400 hover:text-gray-600'
                  }
                  ${isAILoading ? 'animate-pulse' : ''}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title={getAITooltip()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isAILoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : hasAI ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                {!hasAI && (
                  <span className="text-xs font-medium">PRO</span>
                )}
              </motion.button>
            )}

            {/* Expand/Collapse for textareas */}
            {type === 'textarea' && value.length > 100 && (
              <motion.button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </motion.button>
            )}
          </div>
        </div>
      )}
      
      <div className="relative">
        <div className={isExpanded && type === 'textarea' ? 'h-auto' : ''}>
          {renderField()}
        </div>
        
        {/* Character Count */}
        {showCharacterCount && maxLength && (
          <div className="text-xs text-gray-500 mt-1 text-right">
            {value.length}/{maxLength}
          </div>
        )}
        
        {/* AI Suggestions Modal */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-lime-200 rounded-lg shadow-xl z-50"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-lime-600" />
                    <span>AI Suggestions</span>
                  </h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleRegenerate}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Regenerate suggestions"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Close suggestions"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`
                        p-3 rounded-lg border transition-all duration-200 cursor-pointer
                        ${selectedSuggestion === index 
                          ? 'border-lime-500 bg-lime-50' 
                          : 'border-gray-200 hover:border-lime-300 hover:bg-gray-50'
                        }
                      `}
                      onClick={() => setSelectedSuggestion(index)}
                    >
                      <div className="text-sm text-gray-700 leading-relaxed">
                        {suggestion}
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    Click a suggestion to apply it
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    {selectedSuggestion !== null && (
                      <button
                        onClick={() => handleApplySuggestion(suggestions[selectedSuggestion])}
                        className="px-3 py-1.5 text-sm bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors flex items-center space-x-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        <span>Apply</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIEnhancedFormField;
