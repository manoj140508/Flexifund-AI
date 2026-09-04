import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        surface: {
          DEFAULT: "var(--surface)",
          elevated: "var(--surface-elevated)",
        },
        fintech: {
          lightBg: "#F5F9FD",
          lightSurface: "#FFFFFF",
          lightBlue: "#E2EDF8",
          primaryBlue: "#2563EB",
          deepText: "#0F172A",
          secText: "#475569",
          lightBorder: "#D9E5F2",
          positive: "#059669",
          warning: "#D97706",
          negative: "#DC2626",
          // Dark palette
          darkBg: "#07111F",
          darkSurface: "#0F1B2D",
          darkSecSurface: "#14233A",
          darkText: "#F8FAFC",
          darkSecText: "#CBD5E1",
          darkMutedText: "#94A3B8",
          darkBorder: "#263A55",
          darkBlue: "#60A5FA",
          darkGreen: "#34D399",
          darkAmber: "#FBBF24",
          darkError: "#F87171",
        },
        slate: {
          850: "#151e2e",
          950: "#090d16",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
