/**
 * Admin Panel Theme Constants
 * Centralized theme configuration for consistent admin UI styling
 */

export const ADMIN_THEME = {
  // Background Colors
  background: {
    primary: 'bg-gray-900',
    secondary: 'bg-gray-800',
    tertiary: 'bg-gray-700',
    hover: 'bg-gray-750', // Custom hover state
    card: 'bg-gray-800',
    modal: 'bg-gray-800',
  },

  // Text Colors
  text: {
    primary: 'text-white',
    secondary: 'text-gray-300',
    tertiary: 'text-gray-400',
    muted: 'text-gray-500',
    inverse: 'text-gray-900',
  },

  // Border Colors
  border: {
    primary: 'border-gray-700',
    secondary: 'border-gray-600',
    hover: 'border-gray-600',
    focus: 'border-blue-500',
  },

  // Button Styles
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    outline: 'border border-gray-600 hover:bg-gray-700 text-gray-300',
    ghost: 'hover:bg-gray-700 text-gray-300',
  },

  // Input Styles
  input: {
    base: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
    focus: 'focus:border-blue-500 focus:ring-blue-500',
    disabled: 'disabled:bg-gray-800 disabled:text-gray-500',
  },

  // Badge/Status Colors
  badge: {
    active: 'bg-green-900 text-green-300',
    inactive: 'bg-gray-700 text-gray-400',
    draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    sent: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white',
    info: 'bg-blue-600 text-white',
  },

  // Card Styles
  card: {
    base: 'bg-gray-800 border-gray-700',
    header: 'border-b border-gray-700',
    content: 'text-white',
  },

  // Table Styles
  table: {
    header: 'bg-gray-700 text-gray-300',
    row: 'border-b border-gray-700 hover:bg-gray-750',
    cell: 'text-white',
  },

  // Modal Styles
  modal: {
    overlay: 'bg-black/70',
    container: 'bg-gray-800 border-gray-700',
    header: 'border-b border-gray-700',
  },

  // Loading States
  loading: {
    spinner: 'border-white',
    skeleton: 'bg-gray-700',
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

