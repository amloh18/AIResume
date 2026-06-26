import type { ApplicationStatus } from '@/types/automation-schema';
import { Clock, CheckCircle, XCircle, Calendar, Award, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: ApplicationStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<
    ApplicationStatus,
    { label: string; color: string; icon: React.ComponentType<any> }
  > = {
    draft: {
      label: 'Draft',
      color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
      icon: Clock,
    },
    created: {
      label: 'Staging',
      color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      icon: Calendar,
    },
    queued: {
      label: 'Queued',
      color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      icon: Clock,
    },
    applying: {
      label: 'Applying',
      color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
      icon: Clock,
    },
    applied: {
      label: 'Applied',
      color: 'bg-green-500/20 text-green-600 dark:text-green-400',
      icon: CheckCircle,
    },
    failed: {
      label: 'Failed',
      color: 'bg-red-500/20 text-red-600 dark:text-red-400',
      icon: XCircle,
    },
    interview: {
      label: 'Interview',
      color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
      icon: Award,
    },
    offer: {
      label: 'Offer',
      color: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      icon: Award,
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-500/20 text-red-600 dark:text-red-400',
      icon: Ban,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
