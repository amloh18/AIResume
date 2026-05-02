// @ts-nocheck
/**
 * Consistent text sizing system for the entire application
 * Optimized for Cabinet Grotesk font family with rem units
 * Base size: 16px (1rem)
 */

export const textSizes = {
  // Display sizes - for hero sections and major headings
  display: {
    '2xl': 'text-6xl tablet:text-7xl desktop:text-8xl', // 4.5rem (72px) → 5rem (80px) → 6rem (96px)
    'xl': 'text-5xl tablet:text-6xl desktop:text-7xl',   // 3rem (48px) → 4rem (64px) → 4.5rem (72px)
    'lg': 'text-4xl tablet:text-5xl desktop:text-6xl',  // 2.5rem (40px) → 3rem (48px) → 4rem (64px)
  },

  // Heading sizes - for page and section titles
  heading: {
    'xl': 'text-2xl tablet:text-3xl desktop:text-4xl',   // 1.5rem (24px) → 2rem (32px) → 2.5rem (40px)
    'lg': 'text-xl tablet:text-2xl desktop:text-3xl',    // 1.25rem (20px) → 1.5rem (24px) → 2rem (32px)
    'md': 'text-lg tablet:text-xl desktop:text-2xl',     // 1.125rem (18px) → 1.25rem (20px) → 1.5rem (24px)
    'sm': 'text-base tablet:text-lg desktop:text-xl',    // 1rem (16px) → 1.125rem (18px) → 1.25rem (20px)
  },

  // Body text sizes - for content and descriptions
  body: {
    'lg': 'text-lg tablet:text-xl',                 // 1.125rem (18px) → 1.25rem (20px)
    'md': 'text-base tablet:text-lg',               // 1rem (16px) → 1.125rem (18px)
    'sm': 'text-sm tablet:text-base',               // 0.875rem (14px) → 1rem (16px)
  },

  // Label sizes - for form labels and small text
  label: {
    'lg': 'text-sm',                            // 0.875rem (14px)
    'md': 'text-sm tablet:text-base',               // 0.875rem (14px) → 1rem (16px)
    'sm': 'text-xs',                            // 0.75rem (12px)
  },

  // Button sizes - for interactive elements
  button: {
    'lg': 'text-base tablet:text-lg',               // 1rem (16px) → 1.125rem (18px)
    'md': 'text-base',                          // 1rem (16px)
    'sm': 'text-sm',                            // 0.875rem (14px)
  },

  // Caption sizes - for metadata and small info
  caption: {
    'lg': 'text-sm tablet:text-base',               // 0.875rem (14px) → 1rem (16px)
    'md': 'text-xs tablet:text-sm',                 // 0.75rem (12px) → 0.875rem (14px)
    'sm': 'text-xs',                            // 0.75rem (12px)
  },

  // Special sizes for specific use cases
  special: {
    kpi: 'text-xl tablet:text-2xl desktop:text-3xl',     // 1.25rem (20px) → 1.5rem (24px) → 2rem (32px)
    logo: {
      tablet: 'text-lg',                            // 1.125rem (18px)
      tablet: 'text-2xl',                           // 1.5rem (24px)
      desktop: 'text-4xl',                           // 2.5rem (40px)
    },
    badge: 'text-xs',                           // 0.75rem (12px)
    tooltip: 'text-xs tablet:text-sm',              // 0.75rem (12px) → 0.875rem (14px)
  }
};

/**
 * Get text size classes with responsive variants
 */
export const getTextSize = (category: keyof typeof textSizes, size: string) => {
  const categorySizes = textSizes[category];
  if (categorySizes && size in categorySizes) {
    return categorySizes[size as keyof typeof categorySizes];
  }
  return 'text-base'; // fallback
};

/**
 * Predefined text size combinations for common elements
 * Optimized for Cabinet Grotesk with specific weights and optical sizing
 */
export const textElements = {
  // Landing Pages
  heroTitle: textSizes.display['2xl'],           // 4.5rem, Bold (700), opsz 140
  heroSubtitle: textSizes.heading.xl,           // 1.5rem, Medium (500), opsz 60
  pricingTitle: textSizes.display.lg,           // 2.5rem, SemiBold (600), opsz 100
  pricingDescription: textSizes.body.lg,        // 1.125rem, Regular (400), opsz 40
  navigation: textSizes.button.md,               // 1rem, Medium (500), opsz 35
  ctaButton: textSizes.button.md,               // 1rem, Medium (500), opsz 35
  featureText: textSizes.body.md,               // 1rem, Regular (400), opsz 35
  badge: textSizes.special.badge,               // 0.75rem, SemiBold (600), opsz 20
  
  // Dashboard, Settings & Modals
  pageHeader: textSizes.heading.lg,             // 1.25rem, SemiBold (600), opsz 50
  sectionTitle: textSizes.heading.md,           // 1.125rem, SemiBold (600), opsz 45
  widgetTitle: textSizes.heading.md,            // 1.125rem, SemiBold (600), opsz 45
  modalTitle: textSizes.heading.md,             // 1.125rem, SemiBold (600), opsz 45
  bodyText: textSizes.body.md,                  // 1rem, Regular (400), opsz 35
  modalContent: textSizes.body.md,              // 1rem, Regular (400), opsz 35
  cardText: textSizes.button.md,               // 1rem, Medium (500), opsz 35
  buttonText: textSizes.button.md,             // 1rem, Medium (500), opsz 35
  formLabel: textSizes.label.lg,                // 0.875rem, Regular (400), opsz 30
  helperText: textSizes.caption.md,             // 0.75rem, Regular (400), opsz 25
  statusText: textSizes.caption.md,             // 0.75rem, Regular (400), opsz 25
  kpiValue: textSizes.special.kpi,             // 1.5rem, Bold (700), opsz 60
  
  // Studio Editor
  documentTitle: textSizes.heading.lg,          // 1.25rem, SemiBold (600), opsz 50
  panelHeader: textSizes.heading.md,            // 1.125rem, Medium (500), opsz 45
  formInput: textSizes.body.md,                 // 1rem, Regular (400), opsz 35
  studioButton: textSizes.button.md,            // 1rem, Medium (500), opsz 35
  
  // Legacy mappings for backward compatibility
  pageTitle: textSizes.display['xl'],
  pageSubtitle: textSizes.body.lg,
  navItem: textSizes.body.md,
  navBrand: textSizes.special.logo.md,
  dashboardTitle: textSizes.heading.lg,
  dashboardSubtitle: textSizes.body.md,
  widgetContent: textSizes.body.sm,
  kpiLabel: textSizes.label.md,
  formHelper: textSizes.caption.md,
  formError: textSizes.caption.md,
  buttonPrimary: textSizes.button.md,
  buttonSecondary: textSizes.button.md,
  buttonSmall: textSizes.button.sm,
  cardTitle: textSizes.heading.sm,
  cardContent: textSizes.body.sm,
  cardMeta: textSizes.caption.md,
  modalAction: textSizes.button.md,
  tableHeader: textSizes.label.lg,
  tableCell: textSizes.body.sm,
  tableCaption: textSizes.caption.md,
  badgeText: textSizes.special.badge,
  tooltipText: textSizes.special.tooltip,
};

/**
 * Font weight combinations for Cabinet Grotesk
 * Optimized weights for better readability and consistency
 */
export const textWeights = {
  regular: 'font-normal',    // 400 - Regular
  medium: 'font-medium',     // 500 - Medium
  semibold: 'font-semibold', // 600 - SemiBold
  bold: 'font-bold',         // 700 - Bold
  // Cabinet Grotesk specific weights
  light: 'font-light',       // 300 - Light (if available)
  extrabold: 'font-extrabold', // 800 - ExtraBold (if available)
  black: 'font-black',       // 900 - Black (if available)
};

/**
 * Cabinet Grotesk optical sizing values
 * Controls the optical size of the font for different text sizes
 */
export const opticalSizing = {
  // Display sizes - larger optical sizes for better readability at large sizes
  display: 'font-optical-sizing-[140]',  // opsz 140 for hero titles
  heading: 'font-optical-sizing-[100]', // opsz 100 for major headings
  body: 'font-optical-sizing-[60]',      // opsz 60 for body text
  label: 'font-optical-sizing-[45]',     // opsz 45 for labels
  caption: 'font-optical-sizing-[35]',   // opsz 35 for small text
  button: 'font-optical-sizing-[35]',     // opsz 35 for buttons
  kpi: 'font-optical-sizing-[60]',       // opsz 60 for KPI values
  badge: 'font-optical-sizing-[20]',     // opsz 20 for badges
};

/**
 * Line height combinations for better readability
 */
export const textLineHeights = {
  tight: 'leading-tight',     // 1.25
  snug: 'leading-snug',       // 1.375
  normal: 'leading-normal',    // 1.5
  relaxed: 'leading-relaxed', // 1.625
  loose: 'leading-loose',     // 2
};

/**
 * Complete text styling combinations optimized for Cabinet Grotesk
 * Includes size, weight, optical sizing, and line height
 */
export const textStyles = {
  // Landing Pages
  heroTitle: `${textElements.heroTitle} ${textWeights.bold} ${opticalSizing.display} ${textLineHeights.tight}`,
  heroSubtitle: `${textElements.heroSubtitle} ${textWeights.medium} ${opticalSizing.body} ${textLineHeights.relaxed}`,
  pricingTitle: `${textElements.pricingTitle} ${textWeights.semibold} ${opticalSizing.heading} ${textLineHeights.snug}`,
  pricingDescription: `${textElements.pricingDescription} ${textWeights.regular} ${opticalSizing.body} ${textLineHeights.normal}`,
  navigation: `${textElements.navigation} ${textWeights.medium} ${opticalSizing.button} ${textLineHeights.normal}`,
  ctaButton: `${textElements.ctaButton} ${textWeights.medium} ${opticalSizing.button} ${textLineHeights.normal}`,
  featureText: `${textElements.featureText} ${textWeights.regular} ${opticalSizing.body} ${textLineHeights.normal}`,
  badge: `${textElements.badge} ${textWeights.semibold} ${opticalSizing.badge} ${textLineHeights.tight}`,
  
  // Dashboard, Settings & Modals
  pageHeader: `${textElements.pageHeader} ${textWeights.semibold} ${opticalSizing.heading} ${textLineHeights.snug}`,
  sectionTitle: `${textElements.sectionTitle} ${textWeights.semibold} ${opticalSizing.heading} ${textLineHeights.snug}`,
  widgetTitle: `${textElements.widgetTitle} ${textWeights.semibold} ${opticalSizing.heading} ${textLineHeights.snug}`,
  modalTitle: `${textElements.modalTitle} ${textWeights.semibold} ${opticalSizing.heading} ${textLineHeights.snug}`,
  bodyText: `${textElements.bodyText} ${textWeights.regular} ${opticalSizing.body} ${textLineHeights.normal}`,
  modalContent: `${textElements.modalContent} ${textWeights.regular} ${opticalSizing.body} ${textLineHeights.normal}`,
  cardText: `${textElements.cardText} ${textWeights.medium} ${opticalSizing.button} ${textLineHeights.normal}`,
  buttonText: `${textElements.buttonText} ${textWeights.medium} ${opticalSizing.button} ${textLineHeights.normal}`,
  formLabel: `${textElements.formLabel} ${textWeights.regular} ${opticalSizing.label} ${textLineHeights.normal}`,
  helperText: `${textElements.helperText} ${textWeights.regular} ${opticalSizing.caption} ${textLineHeights.normal}`,
  statusText: `${textElements.statusText} ${textWeights.regular} ${opticalSizing.caption} ${textLineHeights.normal}`,
  kpiValue: `${textElements.kpiValue} ${textWeights.bold} ${opticalSizing.kpi} ${textLineHeights.tight}`,
  
  // Studio Editor
  documentTitle: `${textElements.documentTitle} ${textWeights.semibold} ${opticalSizing.heading} ${textLineHeights.snug}`,
  panelHeader: `${textElements.panelHeader} ${textWeights.medium} ${opticalSizing.heading} ${textLineHeights.snug}`,
  formInput: `${textElements.formInput} ${textWeights.regular} ${opticalSizing.body} ${textLineHeights.normal}`,
  studioButton: `${textElements.studioButton} ${textWeights.medium} ${opticalSizing.button} ${textLineHeights.normal}`,
  
  // Legacy combinations for backward compatibility
  pageTitle: `${textElements.pageTitle} ${textWeights.bold} ${textLineHeights.tight}`,
  pageSubtitle: `${textElements.pageSubtitle} ${textWeights.regular} ${textLineHeights.relaxed}`,
  dashboardTitle: `${textElements.dashboardTitle} ${textWeights.semibold} ${textLineHeights.snug}`,
  dashboardSubtitle: `${textElements.dashboardSubtitle} ${textWeights.regular} ${textLineHeights.normal}`,
  widgetContent: `${textElements.widgetContent} ${textWeights.regular} ${textLineHeights.normal}`,
  buttonPrimary: `${textElements.buttonPrimary} ${textWeights.semibold}`,
  buttonSecondary: `${textElements.buttonSecondary} ${textWeights.medium}`,
  formHelper: `${textElements.formHelper} ${textWeights.regular}`,
  kpiLabel: `${textElements.kpiLabel} ${textWeights.medium}`,
  badgeText: `${textElements.badgeText} ${textWeights.medium}`,
};
