import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B6F47',
          light: '#D4A574',
          dark: '#5C4033',
        },
        background: '#FFF8F0',
        accent: '#D4A574',
      },
      fontFamily: {
        sans: ['var(--font-open-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-roboto-slab)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
