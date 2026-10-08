/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          sidebar: {
            bg: "#0B0F19",
            surface: "#111827",
            border: "#1F2937",
            hover: "#1F2937",
            active: "#2563EB",
            text: "#9CA3AF",
            textBright: "#F9FAFB",
          },
          canvas: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          borderSubtle: "#F1F5F9",
          textPrimary: "#0F172A",
          textSecondary: "#475569",
          textMuted: "#94A3B8",
          brand: {
            50: "#EEF2FF",
            100: "#E0E7FF",
            500: "#4F46E5",
            600: "#4338CA",
            700: "#3730A3",
          },
        },
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
        dropdown: "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)",
      },
    },
  },
  plugins: [],
};
