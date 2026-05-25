/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,ts}"],
  theme: {
    extend: {
      colors: {
        charcoal: { DEFAULT: "#1A1818", soft: "#2D2A26" },
        gold: { DEFAULT: "#B8860B", soft: "#C9A86A" },
        cream: "#FAF8F2",
        sand: "#F0EBDD",
        "border-light": "#E5E0D5",
        "border-mid": "#C9C2B0",
        income: { DEFAULT: "#2D6A4F", light: "#B7E4C7" },
        expense: { DEFAULT: "#9A2A2A", light: "#F5C7C7" },
        neutral: "#5C6B47",
        warning: "#C68B17",
        text: {
          primary: "#1A1818",
          secondary: "#6B6258",
          muted: "#9C9385",
          "on-dark": "#FAF8F2",
        },
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        display: ["48px", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["32px", { lineHeight: "1.15", fontWeight: "700" }],
        h2: ["24px", { lineHeight: "1.2", fontWeight: "600" }],
        h3: ["18px", { lineHeight: "1.3", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        label: ["12px", { lineHeight: "1.3", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [],
};
