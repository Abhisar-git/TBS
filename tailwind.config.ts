import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Inter', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      colors: {
        royal: {
          950: '#2A040A',
          900: '#3D070F',
          800: '#5B0E1A',
          700: '#7A1325',
          600: '#8C1D2F',
          500: '#A62439',
          400: '#C23B50',
          300: '#E06B7D',
          100: '#FCE8EC',
          50: '#FFF2F4',
        },
        gold: {
          900: '#5E4712',
          800: '#7D5F1A',
          700: '#9E7B27',
          600: '#B8913C',
          500: '#D4AF37', // Pure Imperial Gold
          400: '#E5C158',
          300: '#F3E5AB',
          200: '#F9F1D4',
          100: '#FDF9EB',
          50: '#FFFDF5',
        },
        ivory: {
          50: '#FFFDF9',
          100: '#FAF6EE',
          200: '#F2EAD9',
          300: '#E6D9C1',
          400: '#D4C3A3',
        },
        charcoal: {
          950: '#0B090A',
          900: '#161214',
          800: '#221C1F',
          700: '#332B2F',
          600: '#4A4045',
          400: '#7A6E74',
          300: '#A89CA2',
          200: '#D4CBD0',
          100: '#F0EBEF',
        },
      },
      backgroundImage: {
        'royal-gradient': 'linear-gradient(135deg, #7A1325 0%, #4A0813 50%, #2A040A 100%)',
        'gold-gradient': 'linear-gradient(135deg, #E5C158 0%, #D4AF37 50%, #9E7B27 100%)',
        'ivory-gradient': 'linear-gradient(180deg, #FFFDF9 0%, #FAF6EE 100%)',
        'gold-shimmer': 'linear-gradient(90deg, rgba(212,175,55,0) 0%, rgba(255,237,160,0.6) 50%, rgba(212,175,55,0) 100%)',
        'royal-glow': 'radial-gradient(circle, rgba(122,19,37,0.15) 0%, rgba(0,0,0,0) 70%)',
      },
      boxShadow: {
        'royal': '0 10px 30px -10px rgba(122, 19, 37, 0.15), 0 20px 40px -15px rgba(0, 0, 0, 0.08)',
        'gold-glow': '0 0 25px 2px rgba(212, 175, 55, 0.25)',
        'royal-glow': '0 0 35px 5px rgba(122, 19, 37, 0.2)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      animation: {
        'shimmer': 'shimmer 2.5s infinite linear',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s infinite ease-in-out',
        'border-spin': 'borderSpin 4s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', filter: 'blur(20px)' },
          '50%': { opacity: '1', filter: 'blur(30px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
