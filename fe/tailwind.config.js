/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      animation: {
        "spin-slow": "spin 5s linear infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "slideInRight": "slideInRight 0.35s ease-out forwards",
        "fadeIn": "fadeIn 0.6s ease-out forwards"
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        }
      },
      fontFamily: {
        audiowide: ["Audiowide", "cursive"],
      },
    },
  },
  plugins: [],
}

