import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // === BRAND ===
        charcoal: {
          DEFAULT: "#1A1818",
          soft: "#2D2A26",
        },
        gold: {
          DEFAULT: "#B8860B",
          soft: "#C9A86A",
        },

        // === SURFACES ===
        cream: "#FAF8F2",
        sand: "#F0EBDD",

        // === BORDERS ===
        "border-light": "#E5E0D5",
        "border-mid": "#C9C2B0",

        // === FUNCTIONAL ===
        income: {
          DEFAULT: "#2D6A4F",
          light: "#B7E4C7",
        },
        expense: {
          DEFAULT: "#9A2A2A",
          light: "#F5C7C7",
        },
        neutral: "#5C6B47",
        warning: "#C68B17",

        // === TEXT ===
        text: {
          primary: "#1A1818",
          secondary: "#6B6258",
          muted: "#9C9385",
          "on-dark": "#FAF8F2",
        },

        // === shadcn-compatibility tokens ===
        // Map our tokens to the variables shadcn expects
        background: "var(--cream)",
        foreground: "var(--charcoal)",
        muted: {
          DEFAULT: "var(--sand)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--gold)",
          foreground: "var(--text-on-dark)",
        },
        primary: {
          DEFAULT: "var(--charcoal)",
          foreground: "var(--text-on-dark)",
        },
        secondary: {
          DEFAULT: "var(--sand)",
          foreground: "var(--charcoal)",
        },
        destructive: {
          DEFAULT: "var(--expense)",
          foreground: "var(--text-on-dark)",
        },
        border: "var(--border-light)",
        input: "var(--border-light)",
        ring: "var(--gold)",
        card: {
          DEFAULT: "var(--cream)",
          foreground: "var(--charcoal)",
        },
        popover: {
          DEFAULT: "var(--cream)",
          foreground: "var(--charcoal)",
        },
      },
      fontFamily: {
        sans: ["Inter", "Aptos", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Our custom type scale (mobile-first)
        display: ["32px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["24px", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "700" }],
        h2: ["18px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        h3: ["14px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["14px", { lineHeight: "1.45", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        label: ["11px", { lineHeight: "1.3", letterSpacing: "0.08em", fontWeight: "600" }],
        caption: ["11px", { lineHeight: "1.3", fontWeight: "400" }],
        "num-xl": ["28px", { lineHeight: "1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "num-lg": ["18px", { lineHeight: "1.2", fontWeight: "600" }],
        "num-md": ["14px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,24,24,0.04), 0 4px 12px rgba(26,24,24,0.06)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
