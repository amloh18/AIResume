'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import UserProfileDialog from './UserProfileDialog';

interface UserIconProps {
  user: {
    name?: string;
    email: string;
    username?: string;
    profilePhoto?: string;
    designation?: string;
  };
}

const UserIcon: React.FC<UserIconProps> = ({ user }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const getUserInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') {
      return 'U'; // Default fallback
    }
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* User Icon Button */}
      <motion.button
        ref={triggerRef}
        onClick={() => setIsDialogOpen(!isDialogOpen)}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 group"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md group-hover:shadow-lg transition-shadow duration-200">
          {user.profilePhoto ? (
            <img 
              src={user.profilePhoto} 
              alt={user.name || 'User'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getUserInitials(user.name)
          )}
        </div>
        <ChevronDown 
          size={14} 
          className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isDialogOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      {/* User Profile Dialog */}
      <UserProfileDialog
        user={user}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        triggerRef={triggerRef}
      />
    </>
  );
};

export default UserIcon;
