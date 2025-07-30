'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  EyeOff,
  Download,
  FileText,
  RotateCcw,
  Sparkles,
  Settings,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface CVStudioToolbarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  isPreviewMode: boolean;
  onPreviewToggle: () => void;
  onExport: (format: 'pdf' | 'json') => void;
  aiSuggestions: any[];
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onAutoFit?: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const CVStudioToolbar: React.FC<CVStudioToolbarProps> = ({
  zoom,
  onZoomChange,
  isPreviewMode,
  onPreviewToggle,
  onExport,
  aiSuggestions,
  canUndo = true,
  canRedo = true,
  onUndo,
  onRedo,
  onAutoFit,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom - 0.1, 0.5));
  };

  const handleZoomReset = () => {
    onZoomChange(1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/20 backdrop-blur-xl border border-white/20 rounded-full px-6 py-2 z-[80]"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-4">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <motion.button
            className={`p-2 rounded-full transition-colors ${
              canUndo 
                ? 'text-white/80 hover:text-white hover:bg-white/10' 
                : 'text-white/30 cursor-not-allowed'
            }`}
            whileHover={canUndo ? { scale: 1.05 } : {}}
            whileTap={canUndo ? { scale: 0.95 } : {}}
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo size={16} />
          </motion.button>
          
          <motion.button
            className={`p-2 rounded-full transition-colors ${
              canRedo 
                ? 'text-white/80 hover:text-white hover:bg-white/10' 
                : 'text-white/30 cursor-not-allowed'
            }`}
            whileHover={canRedo ? { scale: 1.05 } : {}}
            whileTap={canRedo ? { scale: 0.95 } : {}}
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo size={16} />
          </motion.button>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <motion.button
            className={`p-2 rounded-full transition-colors ${
              currentPage > 1
                ? 'text-white/80 hover:text-white hover:bg-white/10' 
                : 'text-white/30 cursor-not-allowed'
            }`}
            whileHover={currentPage > 1 ? { scale: 1.05 } : {}}
            whileTap={currentPage > 1 ? { scale: 0.95 } : {}}
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft size={16} />
          </motion.button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
            <span className="text-sm font-mono text-white min-w-[2rem] text-center">
              {currentPage}
            </span>
            <span className="text-sm text-white/60">/</span>
            <span className="text-sm text-white/60 min-w-[2rem] text-center">
              {totalPages}
            </span>
          </div>
          
          <motion.button
            className={`p-2 rounded-full transition-colors ${
              currentPage < totalPages
                ? 'text-white/80 hover:text-white hover:bg-white/10' 
                : 'text-white/30 cursor-not-allowed'
            }`}
            whileHover={currentPage < totalPages ? { scale: 1.05 } : {}}
            whileTap={currentPage < totalPages ? { scale: 0.95 } : {}}
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight size={16} />
          </motion.button>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <motion.button
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleZoomOut}
          >
            <ZoomOut size={16} />
          </motion.button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
            <span className="text-sm font-mono text-white min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <motion.button
              className="p-1 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleZoomReset}
            >
              <RotateCcw size={12} />
            </motion.button>
          </div>
          
          <motion.button
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleZoomIn}
          >
            <ZoomIn size={16} />
          </motion.button>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Auto Fit */}
        {onAutoFit && (
          <motion.button
            className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 rounded-full text-sm font-medium hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAutoFit}
          >
            <Maximize2 size={14} />
            Auto Fit
          </motion.button>
        )}

        <div className="w-px h-6 bg-white/20" />

        {/* Preview Toggle */}
        <motion.button
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 ${
            isPreviewMode
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPreviewToggle}
        >
          {isPreviewMode ? <EyeOff size={16} /> : <Eye size={16} />}
          {isPreviewMode ? 'Edit Mode' : 'Preview Mode'}
        </motion.button>

        <div className="w-px h-6 bg-white/20" />

        {/* AI Suggestions Indicator */}
        {aiSuggestions.length > 0 && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-full"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            <span className="text-sm text-yellow-400 font-medium">
              {aiSuggestions.length} AI suggestions
            </span>
            <motion.button
              className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Sparkles size={14} />
            </motion.button>
          </motion.div>
        )}

        <div className="w-px h-6 bg-white/20" />

        {/* Export Dropdown */}
        <div className="relative group">
          <motion.button
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-lime-500 to-green-500 text-white rounded-full font-medium hover:from-lime-400 hover:to-green-400 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={16} />
            Export
          </motion.button>

          {/* Export Menu */}
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-black/30 backdrop-blur-xl border border-white/30 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[90]">
            <div className="p-2 space-y-1">
              <button
                className="w-full flex items-center gap-3 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                onClick={() => onExport('pdf')}
              >
                <FileText size={16} />
                <div className="text-left">
                  <div className="font-medium">Export as PDF</div>
                  <div className="text-xs text-white/60">High-quality print format</div>
                </div>
              </button>
              
              <button
                className="w-full flex items-center gap-3 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                onClick={() => onExport('json')}
              >
                <FileText size={16} />
                <div className="text-left">
                  <div className="font-medium">Export as JSON</div>
                  <div className="text-xs text-white/60">Data backup format</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Settings */}
        <motion.button
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CVStudioToolbar; 