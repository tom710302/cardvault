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
        brand: {
          50: "#f0f4ff",
          100: "#dde6ff",
          200: "#c2d1ff",
          300: "#9db3ff",
          400: "#7b8fff",
          500: "#5c6aff",
          600: "#4149f5",
          700: "#3438e0",
          800: "#2b2eb5",
          900: "#292d8e",
          950: "#181a52",
        },
        gold: {
          400: "#f5c842",
          500: "#e8b820",
          600: "#c99a10",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
