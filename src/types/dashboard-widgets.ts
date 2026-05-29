export type UserTier = 'starter' | 'focused' | 'smart';

export type WidgetType = 
  | 'kpi'
  | 'radar'
  | 'list'
  | 'pipeline'
  | 'table'
  | 'chart'
  | 'feed'
  | 'settings'
  | 'hero'
  | 'custom';

export interface WidgetAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  primary?: boolean;
}

export interface DashboardWidgetProps {
  id: string;
  title: string;
  subtitle?: string;
  type: WidgetType;
  userTier: UserTier[];
  loading?: boolean;
  empty?: boolean;
  emptyState?: {
    title: string;
    description: string;
    action?: WidgetAction;
  };
  error?: string | null;
  actions?: WidgetAction[];
  permissions?: string[];
  className?: string;
  children?: React.ReactNode;
  expandable?: boolean;
  onExpand?: () => void;
}

export interface KPIWidgetData {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  actionLabel?: string;
  path?: string;
  color?: string;
}
