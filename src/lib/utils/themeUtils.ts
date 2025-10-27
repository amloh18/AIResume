/**
 * Theme utility functions for consistent theming across the application
 */

export const getThemeClasses = {
  // Background classes - Professional theme with frosted glass
  background: {
    primary: 'bg-gray-50 dark:bg-gray-900',
    secondary: 'bg-gray-100 dark:bg-gray-800',
    tertiary: 'bg-gray-200 dark:bg-gray-700',
    card: 'bg-white/80 dark:bg-gray-800 backdrop-blur-xl border border-white/20 dark:border-gray-700/50',
    cardHover: 'bg-white/90 dark:bg-gray-700 backdrop-blur-xl border border-white/30 dark:border-gray-600/50',
    widget: 'bg-white/70 dark:bg-gray-800 backdrop-blur-xl border border-white/20 dark:border-gray-700/50',
    widgetHover: 'bg-white/80 dark:bg-gray-700 backdrop-blur-xl border border-white/30 dark:border-gray-600/50',
    overlay: 'bg-black/50 dark:bg-black/80',
    gradient: 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800',
    gradientDark: 'bg-gradient-to-br from-gray-900 via-black to-gray-900',
    gradientLight: 'bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200'
  },

  // Text classes - Professional dark theme
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-200',
    tertiary: 'text-gray-500 dark:text-gray-300',
    muted: 'text-gray-400 dark:text-gray-400',
    inverse: 'text-white dark:text-gray-900',
    accent: 'text-lime-600 dark:text-lime-400',
    error: 'text-red-600 dark:text-red-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400'
  },

  // Border classes - Professional dark theme
  border: {
    primary: 'border-gray-200 dark:border-gray-700',
    secondary: 'border-gray-300 dark:border-gray-600',
    accent: 'border-lime-300 dark:border-lime-600',
    error: 'border-red-300 dark:border-red-600',
    transparent: 'border-transparent'
  },

  // Interactive elements
  button: {
    primary: 'bg-lime-600 hover:bg-lime-700 text-white dark:bg-lime-500 dark:hover:bg-lime-600',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300',
    ghost: 'hover:bg-gray-100 text-gray-700 dark:hover:bg-gray-800 dark:text-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600'
  },

  // Input classes
  input: {
    base: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400',
    focus: 'focus:border-lime-500 focus:ring-lime-500 dark:focus:border-lime-400 dark:focus:ring-lime-400',
    error: 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500'
  },

  // Card classes
  card: {
    base: 'bg-white/80 dark:bg-gray-800 backdrop-blur-xl border border-white/20 dark:border-gray-700/50',
    hover: 'hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:bg-white/90 dark:hover:bg-gray-700',
    elevated: 'shadow-md shadow-gray-200/50 dark:shadow-gray-900/50'
  },

  // Modal classes
  modal: {
    overlay: 'bg-black/50 dark:bg-black/70',
    content: 'bg-white/95 dark:bg-gray-800 backdrop-blur-xl border border-white/20 dark:border-gray-700/50',
    header: 'border-b border-white/20 dark:border-gray-700/50',
    footer: 'border-t border-white/20 dark:border-gray-700/50'
  },

  // Navigation classes
  nav: {
    item: 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
    itemActive: 'text-lime-600 dark:text-lime-400',
    background: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700'
  }
};

export const getThemeTransition = 'transition-colors duration-200 ease-in-out';

export const getThemeShadow = {
  sm: 'shadow-sm dark:shadow-gray-900/20',
  md: 'shadow-md dark:shadow-gray-900/30',
  lg: 'shadow-lg dark:shadow-gray-900/40',
  xl: 'shadow-xl dark:shadow-gray-900/50'
};

/**
 * Get theme-aware background classes based on page type
 */
export const getPageBackground = (pageType: 'dashboard' | 'studio' | 'admin' | 'auth') => {
  switch (pageType) {
    case 'dashboard':
      return 'min-h-screen bg-transparent dark:bg-gradient-to-br dark:from-gray-900 dark:via-black dark:to-gray-900';
    case 'studio':
      return 'min-h-screen bg-transparent dark:bg-[#1a230f]';
    case 'admin':
      return 'min-h-screen bg-gray-100 dark:bg-gray-900';
    case 'auth':
      return 'min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-gray-900 dark:via-black dark:to-gray-900';
    default:
      return 'min-h-screen bg-gray-50 dark:bg-gray-900';
  }
};

/**
 * Get theme-aware sidebar classes with floating effect
 */
export const getSidebarClasses = (isOpen: boolean = true, isMobile: boolean = false) => ({
  container: `
    fixed lg:sticky top-0 z-50 h-screen
    ${isMobile ? 'inset-y-0 left-0' : 'top-2 left-2 bottom-2 h-[calc(100vh-1rem)]'}
    ${!isMobile ? 'bg-white/90 dark:bg-gray-800/95' : 'bg-white/95 dark:bg-gray-900/95'} 
    backdrop-blur-xl border border-white/20 dark:border-gray-700/50
    transition-all duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    ${isMobile ? 'w-80' : 'w-72 lg:w-16 xl:w-72'}
    rounded-2xl shadow-xl shadow-gray-900/10 dark:shadow-black/20
    ${!isMobile ? 'm-2' : ''}
  `,
  logo: 'text-lime-600 dark:text-lime-400',
  navItem: 'text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white',
  navItemActive: 'text-lime-600 dark:text-lime-400 bg-lime-50 dark:bg-lime-900/20'
});

/**
 * Get theme-aware top bar classes (always dark)
 */
export const getTopBarClasses = () => ({
  container: 'fixed top-0 left-0 right-0 z-[60] bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/50 shadow-lg',
  content: 'flex items-center justify-between px-6 py-3',
  button: 'text-gray-300 hover:text-white hover:bg-gray-800/50 transition-colors duration-200 px-3 py-2 rounded-lg',
  buttonActive: 'text-lime-400 bg-lime-900/20'
});

/**
 * Get theme-aware studio layout classes with floating panels
 */
export const getStudioLayoutClasses = () => ({
  container: 'min-h-screen space-y-4',
  header: 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 shadow-lg',
  leftPanel: '',
  mainArea: 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-lg',
  rightPanel: 'bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl shadow-lg',
  gap: 'gap-4'
});

/**
 * Get responsive sidebar classes for tablet/mobile
 */
export const getResponsiveSidebarClasses = (isOpen: boolean = true, screenSize: 'mobile' | 'tablet' | 'desktop' = 'desktop') => {
  const baseClasses = 'fixed top-0 z-50 h-screen transition-all duration-300 ease-in-out';
  
  switch (screenSize) {
    case 'mobile':
      return `${baseClasses} ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-white/20 dark:border-gray-700/50`;
    
    case 'tablet':
      return `${baseClasses} ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-20 bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl m-4 shadow-xl`;
    
    case 'desktop':
    default:
      return getSidebarClasses(isOpen).container;
  }
};
