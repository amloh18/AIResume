'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';

interface Advocate {
  id: string;
  name: string;
  email?: string;
  linkedinUrl?: string;
  relation?: 'colleague' | 'friend' | 'alumni' | 'mentor' | 'other';
  company?: string;
}

interface AdvocateLinkProps {
  advocate?: Advocate;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const AdvocateLink: React.FC<AdvocateLinkProps> = ({
  advocate,
  onClick,
  size = 'sm'
}) => {
  if (!advocate) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRelationColor = (relation?: string) => {
    switch (relation) {
      case 'colleague':
        return 'bg-blue-500';
      case 'friend':
        return 'bg-green-500';
      case 'alumni':
        return 'bg-purple-500';
      case 'mentor':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const sizeClasses = {
    tablet: 'w-6 h-6 text-xs',
    tablet: 'w-8 h-8 text-sm',
    desktop: 'w-10 h-10 text-base'
  };

  return (
    <motion.div
      onClick={onClick}
      className={`${sizeClasses[size]} rounded-full ${getRelationColor(advocate.relation)} text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title={`Referral: ${advocate.name}${advocate.company ? ` at ${advocate.company}` : ''}`}
    >
      {advocate.name ? getInitials(advocate.name) : <User className="w-3 h-3" />}
    </motion.div>
  );
};

export default AdvocateLink;

