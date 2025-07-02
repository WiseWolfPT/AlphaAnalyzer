import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    "from-yellow-400",
    "to-orange-500", 
    "from-yellow-500",
    "to-orange-600",
    "from-yellow-600", 
    "bg-gradient-to-r",
    "bg-clip-text",
    "text-transparent",
    "from-black",
    "via-gray-800",
    "to-gray-900",
    "from-gray-700/20",
    "to-black/10",
    "bg-green-500",
    "bg-red-500",
    "text-orange-300",
    "text-orange-400",
    "bg-orange-300",
    "bg-orange-400",
    "hover:bg-orange-400",
    "hover:bg-orange-500",
    "text-tangerine",
    "bg-tangerine"
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        positive: "#10b981",
        negative: "#ef4444", 
        neutral: "#f59e0b",
        tangerine: "#f28500",
        // Enhanced Green Theme Color Palette
        "rich-black": "#000000",
        "deep-black": "#000000",
        "non-photo-blue": "#B1EBFF",
        "xanthous": "#F4B514",
        "chartreuse": "#D8F22D",
        "chartreuse-dark": "#B8D625",
        "chartreuse-light": "#E5F845",
        "chartreuse-darker": "#9CB81D",
        "chartreuse-muted": "#C4D626",
        "pure-white": "#FFFFFF",
        "gray-mouse": "#F5F5F5",
        "dark-slate-navy": "#172631",
        // Accent colors to complement green theme
        "accent-blue": "#4A90E2",
        "accent-purple": "#8E44AD",
        "accent-orange": "#F39C12",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 10px rgba(216, 242, 45, 0.3)",
          },
          "50%": {
            boxShadow: "0 0 25px rgba(216, 242, 45, 0.6)",
          },
        },
        "bounce-gentle": {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-2px)",
          },
        },
        "scale-pulse": {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(1.05)",
          },
        },
        "wiggle": {
          "0%, 100%": {
            transform: "rotate(-1deg)",
          },
          "50%": {
            transform: "rotate(1deg)",
          },
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-6px)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "bounce-gentle": "bounce-gentle 1s ease-in-out infinite",
        "scale-pulse": "scale-pulse 2s ease-in-out infinite",
        "wiggle": "wiggle 1s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
