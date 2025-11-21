'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Clock } from 'lucide-react';
import { calculateStaleness, StalenessResult } from '@/lib/utils/jobStaleness';
// Simple tooltip using CSS group hover

interface StaleCardIndicatorProps {
  job: {
    status: string;
    updatedAt: string | Date;
    applicationDate?: string | Date;
  };
  hasJourney: boolean;
  onFollowUp?: () => void;
}

const StaleCardIndicator: React.FC<StaleCardIndicatorProps> = ({
  job,
  hasJourney,
  onFollowUp
}) => {
  const staleness = calculateStaleness(job, hasJourney);

  // No indicator if not stale
  if (!staleness.isStale) {
    return null;
  }

  const getStyles = (severity: StalenessResult['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          opacity: 'opacity-40',
          badge: 'bg-red-500 text-white',
          icon: 'text-red-500',
          pulse: 'animate-pulse'
        };
      case 'warning':
        return {
          opacity: 'opacity-60',
          badge: 'bg-yellow-500 text-white',
          icon: 'text-yellow-500',
          pulse: ''
        };
      default:
        return {
          opacity: '',
          badge: '',
          icon: '',
          pulse: ''
        };
    }
  };

  const styles = getStyles(staleness.severity);

  const tooltipText = `${staleness.severity === 'critical' ? 'Critical Stale' : 'Stale Job'}: No updates in ${staleness.days} days${onFollowUp ? ' - Click to send follow-up' : ''}`;

  return (
    <motion.div
      className={`relative ${styles.opacity} transition-opacity`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      title={tooltipText}
    >
      {/* Cobweb icon overlay */}
      {staleness.severity === 'warning' && (
        <div className="absolute top-1 right-1 z-10">
          <Clock className={`w-4 h-4 ${styles.icon}`} />
        </div>
      )}

      {/* Critical stale badge */}
      {staleness.severity === 'critical' && (
        <motion.div
          className={`absolute top-0 right-0 z-10 ${styles.badge} ${styles.pulse} px-2 py-1 rounded-full text-xs font-medium shadow-lg`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Follow Up</span>
          </div>
        </motion.div>
      )}

      {/* Follow-up button for critical stale */}
      {staleness.severity === 'critical' && onFollowUp && (
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onFollowUp();
          }}
          className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 ${styles.badge} px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg hover:shadow-xl transition-shadow`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Send Follow-up
        </motion.button>
      )}
    </motion.div>
  );
};

export default StaleCardIndicator;

