import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sampaterra: {
          black: {
            900: "#1A1A1A",
            800: "#2C2C2C",
            700: "#3D3D3D",
          },
          amber: {
            DEFAULT: "#F5A623",
            light: "#F7BB52",
          },
        },
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
