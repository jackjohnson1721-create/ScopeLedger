import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cloud: {
          50: "#f7fbff",
          100: "#e3f2fd",
          200: "#c5e1f7",
          300: "#9ec9ef",
          400: "#6fa9e1",
          500: "#4a8cd1",
          600: "#3670b5",
          700: "#2a5890",
          800: "#20416a",
          900: "#162c48",
        },
        sunrise: {
          100: "#fff9c4",
          200: "#ffe7a8",
          300: "#ffccbc",
        },
        threshold: {
          green: "#2f855a",
          yellow: "#b7791f",
          red: "#c53030",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        drift: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-40px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 600ms ease-out both",
        drift: "drift 60s linear infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
