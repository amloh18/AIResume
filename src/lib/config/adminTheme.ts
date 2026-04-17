/**
 * Admin Panel Theme Constants
 * Centralized theme configuration for consistent admin UI styling
 */

export const ADMIN_THEME = {
  page: {
    background: 'bg-[#f7f7f7] dark:bg-[#f7f7f7]',
  },

  // Background Colors
  background: {
    primary: 'bg-[#f7f7f7] dark:bg-[#f7f7f7]',
    secondary: 'bg-white dark:bg-white',
    tertiary: 'bg-slate-50 dark:bg-slate-50',
    hover: 'hover:bg-slate-50 dark:hover:bg-slate-50',
    card: 'bg-white dark:bg-white',
    modal: 'bg-white dark:bg-white',
  },

  // Text Colors
  text: {
    primary: 'text-slate-900 dark:text-slate-900',
    secondary: 'text-slate-600 dark:text-slate-600',
    tertiary: 'text-slate-500 dark:text-slate-500',
    muted: 'text-slate-400 dark:text-slate-400',
    inverse: 'text-white dark:text-white',
  },

  // Border Colors
  border: {
    primary: 'border-slate-200 dark:border-slate-200',
    secondary: 'border-slate-300 dark:border-slate-300',
    hover: 'hover:border-slate-300 dark:hover:border-slate-300',
    focus: 'focus:border-emerald-600 dark:focus:border-emerald-600',
  },

  // Button Styles
  button: {
    primary: 'bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800 dark:text-white',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900',
    success: 'bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800 dark:text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 dark:text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-700 dark:text-white',
    outline: 'border border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-200 dark:hover:bg-slate-50 dark:text-slate-700',
    ghost: 'hover:bg-slate-50 text-slate-700 dark:hover:bg-slate-50 dark:text-slate-700',
  },

  // Input Styles
  input: {
    base: 'bg-white dark:bg-white border-slate-200 dark:border-slate-200 text-slate-900 dark:text-slate-900 placeholder-slate-400 dark:placeholder-slate-400',
    focus: 'focus:border-emerald-600 focus:ring-emerald-600 dark:focus:border-emerald-600 dark:focus:ring-emerald-600',
    disabled: 'disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-100 dark:disabled:text-slate-400',
  },

  // Badge/Status Colors
  badge: {
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-50 dark:text-emerald-700 dark:border-emerald-200',
    inactive: 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-50 dark:text-slate-600 dark:border-slate-200',
    draft: 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-50 dark:text-slate-700 dark:border-slate-200',
    scheduled: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-50 dark:text-amber-700 dark:border-amber-200',
    sent: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-50 dark:text-emerald-700 dark:border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-50 dark:text-red-700 dark:border-red-200',
    success: 'bg-emerald-700 text-white dark:bg-emerald-700 dark:text-white',
    error: 'bg-red-600 text-white dark:bg-red-600 dark:text-white',
    warning: 'bg-amber-600 text-white dark:bg-amber-600 dark:text-white',
    info: 'bg-emerald-700 text-white dark:bg-emerald-700 dark:text-white',
  },

  // Card Styles
  card: {
    base: 'bg-white dark:bg-white border border-slate-200 dark:border-slate-200 rounded-2xl shadow-sm text-slate-900 dark:text-slate-900',
    header: 'border-b border-slate-200 dark:border-slate-200 text-slate-900 dark:text-slate-900',
    content: 'text-slate-900 dark:text-slate-900',
  },

  // Table Styles
  table: {
    header: 'bg-slate-50 dark:bg-slate-50 text-slate-600 dark:text-slate-600',
    row: 'hover:bg-slate-50 dark:hover:bg-slate-50',
    cell: 'text-slate-900 dark:text-slate-900',
  },

  // Modal Styles
  modal: {
    overlay: 'bg-slate-900/40 dark:bg-slate-900/40 backdrop-blur-sm',
    container: 'bg-white dark:bg-white border border-slate-200 dark:border-slate-200 rounded-2xl',
    header: 'border-b border-slate-200 dark:border-slate-200 text-slate-900 dark:text-slate-900',
  },

  // Loading States
  loading: {
    spinner: 'border-emerald-700 dark:border-emerald-700',
    skeleton: 'bg-slate-200 dark:bg-slate-200',
  },
} as const;

/**
 * Helper function to get theme classes
 */
export function getThemeClasses(category: keyof typeof ADMIN_THEME, key: string): string {
  const categoryObj = ADMIN_THEME[category];
  if (typeof categoryObj === 'object' && categoryObj !== null && key in categoryObj) {
    return (categoryObj as Record<string, string>)[key];
  }
  return '';
}
