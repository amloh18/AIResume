'use client';

import React, { useState } from 'react';
import { ChevronLeft, Save, Download, ChevronRight, ChevronLeft as ChevronLeftIcon } from 'lucide-react';

interface StudioTopBarProps {
  documentType: 'cv' | 'cover-letter';
  setDocumentType: (type: 'cv' | 'cover-letter') => void;
  saveStatus: 'saved' | 'saving' | 'error';
  onExport: (format: 'pdf' | 'docx' | 'json') => void;
  onBack: () => void;
  panelStates: {
    left: boolean;
    right: boolean;
  };
  onTogglePanel: (panel: 'left' | 'right') => void;
}

const StudioTopBar: React.FC<StudioTopBarProps> = ({
  documentType,
  setDocumentType,
  saveStatus,
  onExport,
  onBack,
  panelStates,
  onTogglePanel
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <div className="animate-spin rounded-full h-4 w-4 border-2 border-lime-500 border-t-transparent" />;
      case 'error':
        return <div className="h-4 w-4 bg-red-500 rounded-full" />;
      default:
        return <Save className="h-4 w-4 text-lime-500" />;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'error':
        return 'Save failed';
      default:
        return 'All changes saved';
    }
  };

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
        <h1 className="text-xl font-semibold text-white">Studio</h1>
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
        {/* Save Status */}
        <div className="flex items-center space-x-2 px-3 py-2 bg-gray-700 rounded-lg">
          {getSaveStatusIcon()}
          <span className="text-sm text-gray-300">{getSaveStatusText()}</span>
        </div>

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
