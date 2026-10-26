import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f9',
          100: '#e1e9f2',
          200: '#c3d3e6',
          300: '#95b4d4',
          400: '#608fc0',
          500: '#3b70ab',
          600: '#2c578f',
          700: '#234674',
          800: '#1b375d',
          900: '#0f223a',
          950: '#0a1727',
        },
        brand: {
          navy: '#0f223a',
          blue: '#1e3a8a',
          green: '#059669',
          lightGreen: '#ecfdf5',
          gold: '#d97706',
        }
      },
    },
  },
  plugins: [],
};
export default config;
