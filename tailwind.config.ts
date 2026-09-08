import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // DreamLand palette
        dl: {
          bg: "#0f0f12",
          panel: "#16161b",
          line: "#26262d",
          ink: "#e7e7ea",
          mute: "#9b9ba3",
          accent: "#7c5cff",
          accent2: "#39d98a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;