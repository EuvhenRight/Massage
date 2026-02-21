import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      "4k": "2560px",
    },
    extend: {
      fontFamily: {
        serif: ["var(--font-dm-serif)", "Georgia", "serif"],
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      colors: {
        nearBlack: "#0a0a0a",
        icyWhite: "#f8fafc",
        aurora: {
          white: "#ffffff",
          yellow: "#fbbf24",
          magenta: "#ec4899",
        },
        gold: {
          soft: "#d4af37",
          glow: "#f5d87a",
        },
      },
      backgroundImage: {
        "aurora-gradient":
          "linear-gradient(135deg, #ffffff 0%, #fbbf24 50%, #ec4899 100%)",
        "aurora-gradient-reverse":
          "linear-gradient(315deg, #ec4899 0%, #fbbf24 50%, #ffffff 100%)",
        "noise-texture": "url('/noise.png')",
      },
      animation: {
        aurora: "aurora 8s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "shimmer": "shimmer 3s linear infinite",
      },
      keyframes: {
        aurora: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.02)" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(212, 175, 55, 0.6)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 30px rgba(212, 175, 55, 0.4)",
        "glow-strong": "0 0 50px rgba(212, 175, 55, 0.5)",
        card: "0 4px 30px rgba(0, 0, 0, 0.3)",
        "card-hover":
          "0 8px 40px rgba(212, 175, 55, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
