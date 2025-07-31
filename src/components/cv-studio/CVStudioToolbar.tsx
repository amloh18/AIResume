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
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  aiSuggestions: any[];
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const CVStudioToolbar: React.FC<CVStudioToolbarProps> = ({
  zoom,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  aiSuggestions,
  canUndo = true,
  canRedo = true,
  onUndo,
  onRedo,
  currentPage,
  totalPages,
  onPageChange
}) => {


  return (
    <motion.div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-xl border border-white/30 rounded-full px-6 py-2 z-[80] shadow-2xl"
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
                ? 'text-white hover:text-white hover:bg-white/20' 
                : 'text-white/40 cursor-not-allowed'
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
                ? 'text-white hover:text-white hover:bg-white/20' 
                : 'text-white/40 cursor-not-allowed'
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
                ? 'text-white hover:text-white hover:bg-white/20' 
                : 'text-white/40 cursor-not-allowed'
            }`}
            whileHover={currentPage > 1 ? { scale: 1.05 } : {}}
            whileTap={currentPage > 1 ? { scale: 0.95 } : {}}
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
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
                ? 'text-white hover:text-white hover:bg-white/20' 
                : 'text-white/40 cursor-not-allowed'
            }`}
            whileHover={currentPage < totalPages ? { scale: 1.05 } : {}}
            whileTap={currentPage < totalPages ? { scale: 0.95 } : {}}
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight size={16} />
          </motion.button>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <motion.button
            className="p-2 text-white hover:text-white hover:bg-white/20 rounded-full transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onZoomOut}
          >
            <ZoomOut size={16} />
          </motion.button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
            <span className="text-sm font-mono text-white min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <motion.button
              className="p-1 text-white/80 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onZoomReset}
            >
              <RotateCcw size={12} />
            </motion.button>
          </div>
          
          <motion.button
            className="p-2 text-white hover:text-white hover:bg-white/20 rounded-full transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onZoomIn}
          >
            <ZoomIn size={16} />
          </motion.button>
        </div>

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