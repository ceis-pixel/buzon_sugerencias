import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: "#5C0000",
        secondary: "#A6665C",
        tertiary: "#001586",
        "neutral-gray": "#847370",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
