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
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}