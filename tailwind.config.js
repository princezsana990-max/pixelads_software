/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px minimum
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],     // 14px table/secondary
        'base': ['1rem', { lineHeight: '1.5rem' }],        // 16px base/body
        'section-title': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }], // 20px
        'page-title': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],         // 24px
        'kpi': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],           // 30px (28px–32px)
      },
      colors: {
        brand: {
          50: '#F5F3FF',
          100: '#ECE8FF',
          200: '#D9D3FE',
          300: '#BFB3FC',
          400: '#9E8BF9',
          500: '#7666C8', // Primary
          600: '#6655B8', // Primary Hover
          700: '#53449E',
          800: '#42367E',
          900: '#342B63',
          darkPrimary: '#9585E8',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
          subtle: 'var(--primary-subtle)',
        },
        bg: {
          app: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          secondary: 'var(--bg-secondary)',
        },
        fg: {
          primary: 'var(--fg-primary)',
          secondary: 'var(--fg-secondary)',
          muted: 'var(--fg-muted)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          subtle: 'var(--border-subtle)',
        },
        status: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)',
          info: 'var(--color-info)',
        }
      },
      boxShadow: {
        'card': '0 2px 10px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 10px 25px -5px rgba(118, 102, 200, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'dropdown': '0 10px 38px -10px rgba(22, 23, 24, 0.2), 0 10px 20px -15px rgba(22, 23, 24, 0.1)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      }
    },
  },
  plugins: [],
};
