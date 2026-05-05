import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#101117",
        foreground: "#ececf4",
        primary: "#7c4dff",
        "primary-foreground": "#f8f6ff",
        surface: "#12131a",
        "surface-container": "#181a24",
        "surface-container-high": "#1e2130",
        outline: "#2f3345",
        muted: "#a5a8b8",
        success: "#47d7ac",
        error: "#ff7c8c",
      },
      borderRadius: {
        xl: "1.25rem",
        lg: "0.875rem",
      },
      boxShadow: {
        "elev-1": "0 1px 2px rgba(0,0,0,0.3)",
        "elev-2": "0 8px 24px rgba(0,0,0,0.28)",
        "elev-3": "0 14px 40px rgba(0,0,0,0.35)",
      },
      keyframes: {
        pulseDot: {
          "0%,100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "pulse-dot": "pulseDot 1.8s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
