/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './client/index.html',
    './client/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        vercel: {
          black: '#171717',
          blue: '#0070F3',
          neutral: '#FAFAFA',
          error: '#EE0000',
          success: '#00C853',
          border: 'rgba(0,0,0,0.08)',
          card: '#FFFFFF',
          muted: '#666666',
        },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        full: '9999px',
      },
      boxShadow: {
        geist: '0px 0px 0px 1px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.04)',
        'geist-hover': '0px 0px 0px 1px rgba(0,0,0,0.12), 0px 4px 12px rgba(0,0,0,0.08)',
        'geist-focus': '0px 0px 0px 2px #0070F3',
      },
      letterSpacing: {
        tightest: '-0.04em',
        widecaps: '0.05em',
      },
    },
  },
  plugins: [],
};
