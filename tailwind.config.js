/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/renderer/**/*.{html,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        claude: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f38020",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      boxShadow: {
        "claude-glow":
          "0 0 16px 2px rgba(243, 128, 32, 0.45), 0 0 4px rgba(243, 128, 32, 0.6)",
        "claude-glow-strong":
          "0 0 28px 4px rgba(243, 128, 32, 0.6), 0 0 8px rgba(243, 128, 32, 0.8)",
        "running-glow":
          "0 0 28px 4px rgba(16, 185, 129, 0.6), 0 0 8px rgba(16, 185, 129, 0.8)",
      },
      backgroundImage: {
        "perspective-grid":
          "linear-gradient(to top, rgba(243,128,32,0.18), transparent 65%), repeating-linear-gradient(to right, rgba(243,128,32,0.08) 0 1px, transparent 1px 64px), repeating-linear-gradient(to bottom, rgba(243,128,32,0.08) 0 1px, transparent 1px 64px)",
      },
    },
  },
  plugins: [],
};
