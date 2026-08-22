import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { canvas: "#f6f8fa", ink: "#14213d", brand: { 50: "#eef6ff", 500: "#1877f2", 600: "#0f62d8" } }, boxShadow: { panel: "0 12px 35px rgba(18, 38, 63, .08)" } } },
  plugins: []
};
export default config;
