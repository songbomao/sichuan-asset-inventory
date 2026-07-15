/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  important: '#root',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a237e',
          light: '#534bae',
          dark: '#000051',
        },
        accent: {
          DEFAULT: '#7c4dff',
          light: '#b47cff',
        },
      },
      maxWidth: {
        'mobile': '480px',
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 12px rgba(124, 77, 255, 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1a237e 0%, #4a148c 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(26, 35, 126, 0.05) 0%, rgba(74, 20, 140, 0.05) 100%)',
      },
    },
  },
  plugins: [],
};
