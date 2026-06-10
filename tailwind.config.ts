import type { Config } from "tailwindcss";

/**
 * Semantic color tokens are CSS variables (RGB triplets) defined in globals.css
 * for both dark (default) and light themes. Using `rgb(var(--x) / <alpha-value>)`
 * keeps Tailwind opacity modifiers (e.g. bg-up/15) working while supporting theming.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        "surface-2": token("surface-2"),
        border: token("border"),
        muted: token("muted"),
        fg: token("fg"),
        brand: token("brand"),
        up: token("up"),
        degraded: token("degraded"),
        down: token("down"),
        info: token("info"),
      },
      borderRadius: { lg: "10px", xl: "14px", "2xl": "18px" },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.06), 0 1px 3px rgb(0 0 0 / 0.10)",
        pop: "0 8px 30px rgb(0 0 0 / 0.28)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
