import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic, token-backed palette — flips automatically in `.dark`.
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
        // Flat status colours (neobrutalist blocks; readable on both themes).
        success: "#15a34a",
        danger: "#e11d48",
        warning: "#f59e0b",
        // Back-compat aliases used by older markup.
        canvas: "var(--nb-bg)",
        brand: { 50: "#eef6ff", 500: "var(--nb-accent)", 600: "var(--nb-accent-strong)" },
      },
      borderRadius: { nb: "6px" },
      boxShadow: {
        nb: "var(--nb-shadow)",
        "nb-sm": "2px 2px 0 var(--nb-border)",
        "nb-lg": "6px 6px 0 var(--nb-border)",
        "nb-accent": "4px 4px 0 var(--nb-accent)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
