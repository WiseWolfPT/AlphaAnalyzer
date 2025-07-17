import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  blocklist: [
    // Remove unused utility classes
    'prose',
    'prose-sm',
    'prose-lg',
    'prose-xl',
    'prose-2xl',
    'decoration-*',
    'underline-offset-*',
    'text-decoration-*',
    'overflow-ellipsis',
    'overflow-clip',
    'isolation-*',
    'mix-blend-*',
    'bg-blend-*',
    'filter',
    'backdrop-filter',
    'backdrop-blur-*',
    'backdrop-brightness-*',
    'backdrop-contrast-*',
    'backdrop-grayscale-*',
    'backdrop-hue-rotate-*',
    'backdrop-invert-*',
    'backdrop-opacity-*',
    'backdrop-saturate-*',
    'backdrop-sepia-*',
    'supports-*',
    'motion-*',
    'print:*',
    'portrait:*',
    'landscape:*',
    'contrast-*',
    'forced-colors:*',
    'selection:*',
    'marker:*',
    'file:*',
    'placeholder-shown:*',
    'autofill:*',
    'read-only:*',
    'read-write:*',
    'required:*',
    'valid:*',
    'invalid:*',
    'in-range:*',
    'out-of-range:*',
    'default:*',
    'indeterminate:*',
    'target:*',
    'first-of-type:*',
    'last-of-type:*',
    'only-of-type:*',
    'nth-of-type(*):*',
    'nth-last-of-type(*):*',
    'first-letter:*',
    'first-line:*',
    'empty:*',
    'dir(*):*',
    'lang(*):*',
    'not(*):*',
    'is(*):*',
    'where(*):*',
    'has(*):*',
  ],
  safelist: [
    "bg-gradient-to-r",
    "bg-clip-text",
    "text-transparent",
    // Teya color system
    "bg-teya-green",
    "text-teya-green",
    "border-teya-green",
    "bg-teya-orange",
    "text-teya-orange",
    "bg-teya-gray",
    "bg-teya-dark",
    "text-teya-dark",
    "hover:bg-teya-green",
    "hover:text-teya-green",
    "hover:bg-teya-orange",
    // Legacy colors
    "text-tangerine",
    "bg-tangerine"
  ],
  theme: {
    extend: {
      // Teya Typography System
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.025em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.05em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.05em' }],
        '5xl': ['3rem', { lineHeight: '3rem', letterSpacing: '-0.05em' }],
        '6xl': ['3.75rem', { lineHeight: '3.75rem', letterSpacing: '-0.05em' }],
        '7xl': ['4.5rem', { lineHeight: '4.5rem', letterSpacing: '-0.05em' }],
        '8xl': ['6rem', { lineHeight: '6rem', letterSpacing: '-0.05em' }],
      },
      lineHeight: {
        'tight': '1.1',
        'snug': '1.2',
        'normal': '1.5',
        'relaxed': '1.6',
        'loose': '1.8',
      },
      letterSpacing: {
        'tighter': '-0.05em',
        'tight': '-0.025em',
        'normal': '0em',
        'wide': '0.025em',
        'wider': '0.05em',
        'widest': '0.1em',
      },
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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        positive: "#10b981",
        negative: "#ef4444", 
        neutral: "#f59e0b",
        // Alfalyzer Color System - Inspired by Teya
        "teya-green": "#F4FA4E",       // Verde principal (como Teya) - ÚNICO verde
        "teya-green-dark": "#E6F041",  // Verde mais escuro para melhor contraste
        "teya-orange": "#F57100",      // Laranja para CTAs secundários
        "teya-gray": "#F5F5F5",        // Cinzento claro para fundos (landing)
        "teya-dark": "#151515",        // Fundo escuro para dashboard
        "teya-black": "#000000",       // Preto puro
        "teya-white": "#FFFFFF",       // Branco puro
        // Legacy colors (DEPRECATED - migrar para teya-green)
        tangerine: "#f28500",
        "chartreuse": "#F4FA4E",       // REMAPEADO para teya-green para compatibilidade
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
