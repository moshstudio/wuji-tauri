/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        shake: {
          '0%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '75%': { transform: 'translateX(10px)' },
        },
      },
      animation: {
        'shake': 'shake 0.2s linear 2s infinite',
        'spin-slow': 'spin 9s linear infinite',
      },
    },
    screens: {
      'xs': '360px',
      'sm': '640px',
      'md': '700px',
      'lg': '865px',
      'xl': '1000px',
      '2xl': '1280px',
      '3xl': '1560px',
      '4xl': '1920px',
      '5xl': '2560px',
      '6xl': '3840px',
    },
  },
  plugins: [],
  safelist: [
    // 预生成1-12列的所有可能组合
    ...Array.from({ length: 12 }, (_, i) => `grid-cols-${i + 1}`),

    // 预生成响应式变体
    ...[
      'xs',
      'sm',
      'md',
      'lg',
      'xl',
      '2xl',
      '3xl',
      '4xl',
      '5xl',
      '6xl',
    ].flatMap(prefix =>
      Array.from({ length: 12 }, (_, i) => `${prefix}:grid-cols-${i + 1}`),
    ),
    ...Array.from({ length: 12 }, (_, i) => `p-${i + 1}`),
    ...Array.from({ length: 12 }, (_, i) => `gap-${i + 1}`),
  ],
};
