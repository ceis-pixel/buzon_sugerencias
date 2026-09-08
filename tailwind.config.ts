import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f2",
          100: "#ffe4e6",
          700: "#9f1239",
          900: "#881337",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
