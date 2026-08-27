import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic, token-backed palette shared by the public and operations UI.
        bg: "var(--nb-bg)",
        surface: "var(--nb-surface)",
        "surface-2": "var(--nb-surface-2)",
        ink: "var(--nb-ink)",
        "ink-soft": "var(--nb-ink-soft)",
        line: "var(--nb-border)",
        accent: {
          DEFAULT: "var(--nb-accent)",
          strong: "var(--nb-accent-strong)",
          ink: "var(--nb-accent-ink)",
          soft: "var(--nb-accent-soft)",
        },
        // Status colours are reserved for operational meaning.
        success: "#15a34a",
        danger: "#e11d48",
        warning: "#f59e0b",
        // Back-compat aliases used by older markup.
        canvas: "var(--nb-bg)",
        brand: { 50: "#eef6ff", 500: "var(--nb-accent)", 600: "var(--nb-accent-strong)" },
      },
      borderRadius: { nb: "var(--nb-radius)" },
      boxShadow: {
        nb: "var(--nb-shadow)",
        "nb-sm": "0 1px 2px rgba(28, 27, 24, 0.04)",
        "nb-lg": "0 6px 18px rgba(28, 27, 24, 0.06)",
        "nb-accent": "0 0 0 3px rgba(36, 35, 32, 0.08)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
