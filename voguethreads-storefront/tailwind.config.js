/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#FFFFFF",
          card: "#FFFFFF",
          elevated: "#FBFBF9",
          muted: "#F5F4F0",
        },
        "brand-primary": "#0B0B0B",
        "text-primary": "#0B0B0B",
        "text-muted": "#5A5A5E",
        border: {
          DEFAULT: "#EDEDF0",
          subtle: "#E5E2DC",
        },
        background: {
          DEFAULT: "#E8E4DC",
          alt: "#DFDAD0",
        },
        vt: {
          black: "#0B0B0B",
          charcoal: "#141414",
          surface: "#FFFFFF",
          white: "#FFFFFF",
          offwhite: "#E8E4DC",
          stone: "#EDEDF0",
          graphite: "#5A5A5E",
          muted: "#8E8E93",
          accent: "#E53935",
          lavender: "#E8E5F2",
          border: "#E2E2E6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
        "glass-lg": "0 16px 48px -8px rgba(0, 0, 0, 0.15)",
        "glass-dark": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        card: "0 2px 12px -2px rgba(0, 0, 0, 0.04), 0 1px 4px -1px rgba(0, 0, 0, 0.02)",
        "card-hover": "0 12px 28px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03)",
        floating: "0 20px 40px -10px rgba(0, 0, 0, 0.2)",
      },
      backdropBlur: {
        xs: "2px",
        glass: "16px",
        "glass-heavy": "24px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-down": "slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 2s infinite linear",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: 0, transform: "translateY(-12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
