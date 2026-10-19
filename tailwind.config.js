/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border-hsl, 220 13% 91%))",
        input: "hsl(var(--input-hsl, 220 13% 91%))",
        ring: "hsl(var(--ring-hsl, 238 82% 59%))",
        background: "hsl(var(--background-hsl, 210 40% 98%))",
        foreground: "hsl(var(--foreground-hsl, 222 47% 11%))",
        primary: {
          DEFAULT: "hsl(var(--primary-hsl, 238 82% 59%))",
          foreground: "hsl(var(--primary-foreground-hsl, 0 0% 100%))",
          hover: "hsl(238 75% 53%)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary-hsl, 210 40% 96%))",
          foreground: "hsl(var(--secondary-foreground-hsl, 222 47% 11%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive-hsl, 347 77% 50%))",
          foreground: "hsl(var(--destructive-foreground-hsl, 0 0% 100%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted-hsl, 210 40% 96%))",
          foreground: "hsl(var(--muted-foreground-hsl, 215 16% 47%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent-hsl, 210 40% 96%))",
          foreground: "hsl(var(--accent-foreground-hsl, 222 47% 11%))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover-hsl, 0 0% 100%))",
          foreground: "hsl(var(--popover-foreground-hsl, 222 47% 11%))",
        },
        card: {
          DEFAULT: "hsl(var(--card-hsl, 0 0% 100%))",
          foreground: "hsl(var(--card-foreground-hsl, 222 47% 11%))",
        },
        // Zyphor Signature Brand Tokens
        zyphor: {
          navy: {
            50: "#f0f4f8",
            100: "#d9e2ec",
            200: "#bcccdc",
            300: "#9fb3c8",
            400: "#829ab1",
            500: "#627d98",
            600: "#486581",
            700: "#334e68",
            800: "#1e3a5f",
            900: "#0f172a",
            950: "#09101d",
          },
          indigo: {
            50: "#eef2ff",
            100: "#e0e7ff",
            200: "#c7d2fe",
            300: "#a5b4fc",
            400: "#818cf8",
            500: "#6366f1",
            600: "#4f46e5",
            700: "#4338ca",
            800: "#3730a3",
            900: "#312e81",
          },
          green: {
            50: "#f0fdf4",
            100: "#dcfce7",
            200: "#bbf7d0",
            300: "#86efac",
            400: "#4ade80",
            500: "#22c55e",
            600: "#16a34a",
            700: "#15803d",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius, 10px)",
        md: "calc(var(--radius, 10px) - 2px)",
        sm: "calc(var(--radius, 10px) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
