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
          lightBg: "#F5FAFF",
          lightSurface: "#FFFFFF",
          lightBlue: "#E0F2FE",
          primaryBlue: "#2563EB",
          deepText: "#0F2747",
          secText: "#52657A",
          lightBorder: "#D7E7F5",
          // Dark palette
          darkBg: "#0B1220",
          darkSurface: "#111C2E",
          darkSecSurface: "#17243A",
          darkText: "#F8FAFC",
          darkSecText: "#B8C5D6",
          darkMutedText: "#8FA2B8",
          darkBorder: "#2A3B52",
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
