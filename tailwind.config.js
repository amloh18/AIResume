/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: 'class',
  theme: {
    screens: {
      // Default Tailwind breakpoints
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Custom aliases for semantic naming
      'mobile': '0px',      // Base mobile (0px+) - default, no prefix needed
      'tablet': '768px',   // Same as md
      'desktop': '1024px', // Same as lg
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Global Design Token Colors
        brand: {
          primary: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          active: "var(--color-primary-active)",
          foreground: "var(--color-primary-foreground)",
          soft: "var(--color-primary-soft)",
          softHover: "var(--color-primary-soft-hover)",
          accent: "var(--color-accent-green)",
          accentHover: "var(--color-accent-green-hover)",
          accentSoft: "var(--color-accent-green-soft)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          elevated: "var(--color-surface-elevated)",
          subtle: "var(--color-surface-subtle)",
          muted: "var(--color-surface-muted)",
        },
        status: {
          success: "var(--status-success)",
          warning: "var(--status-warning)",
          danger: "var(--status-danger)",
          info: "var(--status-info)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "control-xs": "var(--radius-xs)",
        "control-sm": "var(--radius-sm)",
        "control-md": "var(--radius-md)",
        "control-lg": "var(--radius-lg)",
        "control-xl": "var(--radius-xl)",
        "control-full": "var(--radius-full)",
      },
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "1rem" }],
        sm: ["var(--text-sm)", { lineHeight: "1.25rem" }],
        md: ["var(--text-md)", { lineHeight: "1.5rem" }],
        lg: ["var(--text-lg)", { lineHeight: "1.75rem" }],
        xl: ["var(--text-xl)", { lineHeight: "1.75rem" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "2rem" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "2.25rem" }],
        "4xl": ["var(--text-4xl)", { lineHeight: "2.5rem" }],
        "5xl": ["var(--text-5xl)", { lineHeight: "1" }],
      },
      height: {
        macro: "100dvh",
        "control-sm": "var(--control-height-sm)", // 32px
        "control-md": "var(--control-height-md)", // 40px
        "control-lg": "var(--control-height-lg)", // 46px
      },
      minHeight: {
        "control-sm": "var(--control-height-sm)",
        "control-md": "var(--control-height-md)",
        "control-lg": "var(--control-height-lg)",
      },
      backdropBlur: {
        glass: "12px",
      },
      // Tailwind v4 renamed/extended the shadow scale, and this codebase
      // already references `shadow-2xs` (50x) and `shadow-xs` (80x). Tailwind
      // v3 only ships sm | DEFAULT | md | lg | xl | inner | none, so without
      // these two tokens every one of those classes compiled to nothing and
      // silently dropped the intended elevation. Values match Tailwind v4's
      // `--shadow-2xs` / `--shadow-xs` defaults.
      boxShadow: {
        "2xs": "0 1px rgb(0 0 0 / 0.05)",
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/container-queries"),
  ],
}
