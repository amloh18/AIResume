'use client';

import React, { useState } from 'react';
import { ChevronLeft, Save, Download, ChevronRight, ChevronLeft as ChevronLeftIcon, Edit2, Check, X } from 'lucide-react';

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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentTitle);



  return (
    <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 z-50 sticky top-0">
      {/* Left Region */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          title="Back to Dashboard"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold text-white">Studio</h1>
          <span className="text-gray-400">•</span>
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
                className="px-2 py-1 bg-gray-700 text-white text-lg font-semibold rounded border border-gray-600 focus:border-lime-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => onTitleUpdate(tempTitle)}
                className="p-1 text-green-400 hover:text-green-300 transition-colors"
                title="Save title"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setTempTitle(documentTitle);
                  setIsEditingTitle(false);
                }}
                className="p-1 text-red-400 hover:text-red-300 transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-medium text-gray-300">{documentTitle}</h2>
              <button
                onClick={() => {
                  setTempTitle(documentTitle);
                  setIsEditingTitle(true);
                }}
                className="p-1 text-gray-400 hover:text-white transition-colors"
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
        <div className="bg-gray-700 rounded-lg p-1 flex">
          <button
            onClick={() => setDocumentType('cv')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              documentType === 'cv'
                ? 'bg-lime-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            CV
          </button>
          <button
            onClick={() => setDocumentType('cover-letter')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              documentType === 'cover-letter'
                ? 'bg-lime-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            Cover Letter
          </button>
        </div>
      </div>

      {/* Right Region */}
      <div className="flex items-center space-x-3">
        {/* Unified Save Button with Status */}
        <button
          onClick={onManualSave}
          disabled={saveStatus === 'saving'}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm
            ${saveStatus === 'saving' 
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed' 
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
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-transparent" />
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

        {/* Export Menu */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Export Document"
          >
            <Download className="h-4 w-4" />
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
              <div className="py-1">
                <button
                  onClick={() => {
                    onExport('pdf');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Export as PDF
                </button>
                <button
                  onClick={() => {
                    onExport('docx');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Export as DOCX
                </button>
                <button
                  onClick={() => {
                    onExport('json');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Export as JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close export menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
};

export default StudioTopBar;
