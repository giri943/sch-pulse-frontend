import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e14",
        surface: "#11151d",
        border: "#1e2530",
        muted: "#6b7280",
        fg: "#e6e9ef",
        brand: "#6366f1",
        up: "#22c55e",
        degraded: "#eab308",
        down: "#ef4444",
      },
      borderRadius: { xl: "12px" },
    },
  },
  plugins: [],
};

export default config;
