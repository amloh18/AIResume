'use client';

import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Save, 
  ChevronRight, 
  ChevronLeft as ChevronLeftIcon, 
  Edit2, 
  Check, 
  X,
  FileText,
  Briefcase,
  PenTool,
  Archive,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import UserIcon from '@/components/ui/UserIcon';
import { useSession } from 'next-auth/react';

interface StudioTopBarProps {
  documentType: 'cv' | 'cover-letter';
  setDocumentType: (type: 'cv' | 'cover-letter') => void;
  saveStatus: 'saved' | 'saving' | 'error';
  onExport: (format: 'pdf' | 'docx' | 'json') => void;
  onBack: () => void;
  onManualSave: () => void;
  panelStates: {
    left: boolean;
    right: boolean;
  };
  onTogglePanel: (panel: 'left' | 'right') => void;
  documentTitle: string;
  onTitleUpdate: (newTitle: string) => void;
  isEditingTitle: boolean;
  setIsEditingTitle: (editing: boolean) => void;
}

const StudioTopBar: React.FC<StudioTopBarProps> = ({
  documentType,
  setDocumentType,
  saveStatus,
  onExport,
  onBack,
  onManualSave,
  panelStates,
  onTogglePanel,
  documentTitle,
  onTitleUpdate,
  isEditingTitle,
  setIsEditingTitle
}) => {
  const [tempTitle, setTempTitle] = useState(documentTitle);
  const { data: session } = useSession();

  return (
    <div className="h-16 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 z-50 sticky top-0 shadow-sm transition-colors duration-200 bg-white/95 dark:bg-gray-800/95">
      {/* Left Region */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 transition-colors rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Back to Dashboard"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-2">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Studio</h1>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          {isEditingTitle ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onTitleUpdate(tempTitle);
                  } else if (e.key === 'Escape') {
                    setTempTitle(documentTitle);
                    setIsEditingTitle(false);
                  }
                }}
                className="px-2 py-1 text-base font-semibold rounded border focus:outline-none transition-colors bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={() => onTitleUpdate(tempTitle)}
                className="p-1 text-green-600 hover:text-green-700 transition-colors"
                title="Save title"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setTempTitle(documentTitle);
                  setIsEditingTitle(false);
                }}
                className="p-1 text-red-600 hover:text-red-700 transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-medium text-gray-700 dark:text-gray-300">{documentTitle}</h2>
              <button
                onClick={() => {
                  setTempTitle(documentTitle);
                  setIsEditingTitle(true);
                }}
                className="p-1 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title="Edit title"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center Region - Document Type Toggle */}
      <div className="flex items-center">
        <div className="rounded-lg p-1 flex bg-gray-100 dark:bg-gray-800">
          <button
            onClick={() => setDocumentType('cv')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              documentType === 'cv'
                ? 'bg-lime-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            CV
          </button>
          <button
            onClick={() => setDocumentType('cover-letter')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              documentType === 'cover-letter'
                ? 'bg-lime-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Cover Letter
          </button>
        </div>
      </div>

      {/* Right Region - User Icon */}
      <div className="flex items-center space-x-3">
        {/* User Icon */}
        {session?.user && (
          <UserIcon 
            user={{
              name: session.user.name || 'User',
              email: session.user.email || 'user@example.com',
              profilePhoto: session.user.image,
              designation: 'CV Creator'
            }}
          />
        )}

        {/* Unified Save Button with Status */}
        <button
          onClick={onManualSave}
          disabled={saveStatus === 'saving'}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm min-w-[120px] justify-center
            ${saveStatus === 'saving' 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : saveStatus === 'error'
              ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
              : 'bg-lime-600 text-white hover:bg-lime-700 active:bg-lime-800'
            }
            ${saveStatus === 'saved' ? 'ring-2 ring-lime-400 ring-opacity-50' : ''}
          `}
          title={saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed - Click to retry' : 'Save manually'}
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
              <span>Saving...</span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <div className="h-4 w-4 bg-red-400 rounded-full" />
              <span>Save Failed</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Saved</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StudioTopBar;
