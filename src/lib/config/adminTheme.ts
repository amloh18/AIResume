/**
 * Admin Panel Theme Constants - Obsidian & Emerald Redesign
 * Centralized theme configuration for high-end admin UI styling
 */

export const ADMIN_THEME = {
  page: {
    background: 'bg-[#0a0a0a] dark:bg-[#0a0a0a]',
  },

  // Background Colors
  background: {
    primary: 'bg-[#0a0a0a] dark:bg-[#0a0a0a]',
    secondary: 'bg-[#111111] dark:bg-[#111111]',
    tertiary: 'bg-[#1a1a1a] dark:bg-[#1a1a1a]',
    hover: 'hover:bg-[#1a1a1a] dark:hover:bg-[#1a1a1a]',
    card: 'bg-[#111111] dark:bg-[#111111]',
    modal: 'bg-[#111111] dark:bg-[#111111]',
    glass: 'bg-white/5 backdrop-blur-xl border border-white/10',
    glassHover: 'hover:bg-white/10 transition-all duration-300',
  },

  // Text Colors
  text: {
    primary: 'text-white dark:text-white',
    secondary: 'text-slate-400 dark:text-slate-400',
    tertiary: 'text-slate-500 dark:text-slate-500',
    muted: 'text-slate-600 dark:text-slate-600',
    accent: 'text-emerald-400 dark:text-emerald-400',
    inverse: 'text-black dark:text-black',
  },

  // Border Colors
  border: {
    primary: 'border-white/10 dark:border-white/10',
    secondary: 'border-white/20 dark:border-white/20',
    hover: 'hover:border-emerald-500/50 dark:hover:border-emerald-500/50',
    focus: 'focus:border-emerald-500 dark:focus:border-emerald-500',
    accent: 'border-emerald-500/30 dark:border-emerald-500/30',
  },

  // Button Styles
  button: {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all duration-300',
    secondary: 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 transition-all duration-300',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white transition-all',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all',
    warning: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition-all',
    outline: 'border border-white/10 hover:bg-white/5 text-slate-300 transition-all',
    ghost: 'hover:bg-white/5 text-slate-400 hover:text-white transition-all',
  },

  // Input Styles
  input: {
    base: 'bg-black/40 border-white/10 text-white placeholder-slate-600 focus:ring-emerald-500/20',
    focus: 'focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300',
    disabled: 'opacity-50 cursor-not-allowed',
  },

  // Badge/Status Colors
  badge: {
    active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    inactive: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
    draft: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    scheduled: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    sent: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
    success: 'bg-emerald-500 text-black font-bold',
    error: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-black',
    info: 'bg-blue-500 text-white',
  },

  // Card Styles
  card: {
    base: 'bg-[#111111] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-300',
    header: 'px-8 py-6 border-b border-white/5 bg-white/2',
    content: 'p-8',
  },

  // Table Styles
  table: {
    header: 'bg-white/5 text-slate-400 font-medium uppercase tracking-wider text-xs',
    row: 'border-b border-white/5 hover:bg-white/2 transition-colors',
    cell: 'py-4 px-6 text-slate-300',
  },

  // Modal Styles
  modal: {
    overlay: 'bg-black/80 backdrop-blur-md transition-all duration-500',
    container: 'bg-[#111111] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)]',
    header: 'p-8 border-b border-white/5',
  },

  // Loading States
  loading: {
    spinner: 'border-emerald-500',
    skeleton: 'bg-white/5 animate-pulse rounded-2xl',
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
