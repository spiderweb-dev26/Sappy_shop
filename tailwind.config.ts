import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "emerald-deep": "#065F46",
        mint: "#A7F3D0",
        cream: "#FFF8E7",
        "cream-deep": "#F5EBD6",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 8px 24px rgba(6,95,70,0.08)",
        lift: "0 14px 34px rgba(6,95,70,0.14)",
        ring: "0 0 0 3px rgba(167,243,208,0.5)",
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-14px)" } },
        scanline: { "0%": { top: "0%" }, "100%": { top: "100%" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
        pop: { from: { opacity: "0", transform: "scale(.96)" }, to: { opacity: "1", transform: "scale(1)" } },
      },
      animation: {
        floaty: "floaty 7s ease-in-out infinite",
        scanline: "scanline 2.6s linear infinite",
        "fade-up": "fade-up .45s cubic-bezier(.22,.61,.36,1) both",
        pop: "pop .35s ease both",
      },
    },
  },
  plugins: [],
};
export default config;