/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'cabinet': ['Cabinet Grotesk', 'system-ui', 'sans-serif'],
        'sans': ['Cabinet Grotesk', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Custom font sizes optimized for Cabinet Grotesk
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],    // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px
        '3xl': ['2rem', { lineHeight: '2.25rem' }],      // 32px
        '4xl': ['2.5rem', { lineHeight: '2.5rem' }],     // 40px
        '5xl': ['3rem', { lineHeight: '1' }],           // 48px
        '6xl': ['4.5rem', { lineHeight: '1' }],         // 72px
        '7xl': ['5rem', { lineHeight: '1' }],           // 80px
        '8xl': ['6rem', { lineHeight: '1' }],           // 96px
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900',
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      screens: {
        '3xl': '1920px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
} 