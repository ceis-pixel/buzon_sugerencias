import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
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
