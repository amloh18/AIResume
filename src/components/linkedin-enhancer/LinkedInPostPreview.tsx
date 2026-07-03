import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Edit2, CheckCircle, AlertCircle } from 'lucide-react';

interface LinkedInPostPreviewProps {
  postContent: string;
  onContentChange?: (content: string) => void;
  onPost?: () => void;
  isPosting?: boolean;
  characterLimit?: number;
}

export default function LinkedInPostPreview({
  postContent,
  onContentChange,
  onPost,
  isPosting = false,
  characterLimit = 3000,
}: LinkedInPostPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(postContent);

  const characterCount = editedContent.length;
  const charactersRemaining = characterLimit - characterCount;
  const isOverLimit = charactersRemaining < 0;

  const handleSave = () => {
    onContentChange?.(editedContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(postContent);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0a66c2]/10 rounded-lg flex items-center justify-center">
            <ExternalLink className="w-4 h-4 text-[#0a66c2]" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">LinkedIn Post Preview</h3>
            <p className="text-small text-gray-500 dark:text-gray-400">How your post will appear on LinkedIn</p>
          </div>
        </div>
        {!isEditing && onContentChange && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsEditing(true);
              setEditedContent(postContent);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-small text-[#0a66c2] hover:bg-[#0a66c2]/10 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </motion.button>
        )}
      </div>

      {/* Post Content */}
      <div className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full min-h-[200px] p-4 text-small border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-black/20 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/20"
              placeholder="Write your LinkedIn post..."
            />
            <div className="flex items-center justify-between">
              <span className={`text-small ${
                isOverLimit ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {charactersRemaining} characters remaining
              </span>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancel}
                  className="px-4 py-2 text-small text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={isOverLimit}
                  className="px-4 py-2 text-small bg-[#0a66c2] hover:bg-[#004182] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </motion.button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Post Author */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#0a66c2]/10 rounded-full flex items-center justify-center">
                <span className="text-[#0a66c2] font-bold">
                  {postContent.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Your Name</p>
                <p className="text-small text-gray-500 dark:text-gray-400">
                  1st • Your Company • 2h
                </p>
              </div>
            </div>

            {/* Post Text */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                {postContent || 'No content to display'}
              </p>
            </div>

            {/* Character Count Warning */}
            {isOverLimit && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-500 text-small bg-red-50 dark:bg-red-900/20 p-3 rounded-lg"
              >
                <AlertCircle className="w-4 h-4" />
                Post exceeds LinkedIn's {characterLimit} character limit by {Math.abs(charactersRemaining)} characters
              </motion.div>
            )}

            {/* Post Stats */}
            <div className="flex items-center gap-4 text-small text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-white/10">
              <span>{characterCount.toLocaleString()} characters</span>
              <span>•</span>
              <span>{Math.round((characterCount / characterLimit) * 100)}% of limit</span>
            </div>
          </div>
        )}
      </div>

      {/* Post Actions */}
      {!isEditing && onPost && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPost}
            disabled={isPosting || isOverLimit}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPosting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Post to LinkedIn
              </>
            )}
          </motion.button>
          <p className="text-center text-small text-gray-400 dark:text-gray-500 mt-3">
            This will be shared with your LinkedIn network
          </p>
        </div>
      )}
    </motion.div>
  );
}
