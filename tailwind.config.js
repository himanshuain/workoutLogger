/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Batman Dark Theme (dark mode) - Dark grays with yellow accent
        iron: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#1c1c1e',
          950: '#0a0a0b',
        },
        // Sync light theme — cream, forest, ink
        sync: {
          cream: '#f2efe6',
          'cream-light': '#faf8f3',
          'cream-pressed': '#e8e4d9',
          forest: '#004236',
          ink: '#1a1a1a',
          red: '#d91a11',
          'red-dark': '#b01510',
          mint: '#90ee90',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Batman theme - Yellow/Gold accent for dark mode
        lift: {
          primary: '#fbbf24',
          secondary: '#f59e0b',
          accent: '#fcd34d',
        },
        // Sync light theme accents
        workout: {
          primary: '#d91a11',
          secondary: '#b01510',
          light: '#e84a42',
          blue: '#004236',
          'blue-light': '#0a5c4d',
        },
        spider: {
          red: '#d91a11',
          'red-light': '#e84a42',
          'red-dark': '#b01510',
          blue: '#004236',
          'blue-light': '#0a5c4d',
          'blue-dark': '#003329',
        },
        // Batman Yellow/Gold
        bat: {
          yellow: '#fbbf24',
          'yellow-light': '#fcd34d',
          'yellow-dark': '#f59e0b',
          black: '#0a0a0b',
          gray: '#1c1c1e',
        },
        /** Elevation tokens — map to CSS vars (page → section → interactive → pressed) */
        surface: {
          page: 'var(--surface-page)',
          section: 'var(--surface-section)',
          interactive: 'var(--surface-interactive)',
          pressed: 'var(--surface-pressed)',
          selected: 'var(--surface-selected)',
        },
      },
      borderColor: {
        surface: {
          DEFAULT: 'var(--surface-border)',
          subtle: 'var(--surface-border-subtle)',
        },
      },
      fontFamily: {
        display: ['var(--font-fjalla-one)', 'system-ui', 'sans-serif'],
        body: ['var(--font-fjalla-one)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-fjalla-one)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        /** 20px — gap between major page sections */
        section: '1.25rem',
        /** 16px — gap within a section (rows, form fields) */
        'section-inner': '1rem',
      },
      borderRadius: {
        /** 12px — cards, panels, dialogs, buttons, inputs */
        card: '12px',
        /** Capsule — filter/habit pills and toggle tracks only */
        pill: '9999px',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
      },
      backgroundImage: {
        'workout-gradient': 'linear-gradient(135deg, #4F8CFF 0%, #6366f1 100%)',
        'workout-gradient-dark': 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
