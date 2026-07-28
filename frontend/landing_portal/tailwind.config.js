/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["Bebas Neue", "sans-serif"],
      },
      colors: {
        // Sahyog custom branding colors
        sahyog: {
          primary: "#50ABE7",
          "primary-light": "#EDF7FF",
          "primary-dark": "#2E8DC7",
          accent: "#7AD8FF",
          surface: "#F8FAFC",
          dark: "#1E293B",
          muted: "#64748B",
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        },
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        card: "0 2px 16px rgba(80, 171, 231, 0.08), 0 1px 4px rgba(0,0,0,0.04)",
        float: "0 8px 32px rgba(80, 171, 231, 0.16), 0 2px 8px rgba(0,0,0,0.06)",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%": { transform: "scaleY(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
        wave: "wave 0.8s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
    },
  },
  plugins: [],
}
