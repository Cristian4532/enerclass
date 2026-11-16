import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22"
        },
        ink: {
          950: "#050b14",
          900: "#08111f",
          850: "#0b1627",
          800: "#0d1a2b",
          700: "#14263b"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "Cascadia Code", "Consolas", "monospace"]
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px -18px rgba(15, 23, 42, 0.18)",
        "card-dark": "0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 38px -24px rgba(0,0,0,0.8)",
        glow: "0 0 0 1px rgba(16,185,129,0.2), 0 12px 40px -12px rgba(16,185,129,0.45)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(16,185,129,0.45)" },
          "70%": { boxShadow: "0 0 0 8px rgba(16,185,129,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(16,185,129,0)" }
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" }
        },
        "dash-flow": {
          to: { strokeDashoffset: "-24" }
        }
      },
      animation: {
        "fade-up": "fade-up .4s ease-out both",
        "pulse-ring": "pulse-ring 2s infinite",
        shimmer: "shimmer 1.8s infinite",
        "dash-flow": "dash-flow 1.2s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
