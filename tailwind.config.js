// =============================================================================
// Tailwind CSS Configuration - Space Odyssey 2001 Theme
// =============================================================================
// Inference Security CTF - HAL 9000 inspired theme
// =============================================================================

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode uses class strategy for manual toggle
  darkMode: ["class"],
  
  // Files to scan for Tailwind classes
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  
  theme: {
    // Container configuration
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    
    extend: {
      // =======================================================================
      // Color Palette - Space Odyssey 2001
      // =======================================================================
      colors: {
        // CSS variable-based colors for theming
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // Space Odyssey theme colors
        hal: {
          red: "hsl(0 72% 51%)",           // HAL's iconic red eye
          "red-light": "hsl(0 72% 65%)",
          "red-dark": "hsl(0 72% 35%)",
          glow: "hsl(0 72% 51% / 0.5)",
        },
        console: {
          blue: "hsl(199 89% 48%)",        // Console screen blue
          "blue-light": "hsl(199 89% 58%)",
          "blue-dark": "hsl(199 89% 38%)",
          glow: "hsl(199 89% 48% / 0.5)",
        },
        space: {
          black: "hsl(222 47% 4%)",        // Deep space black
          dark: "hsl(222 47% 7%)",
          medium: "hsl(222 47% 15%)",
          light: "hsl(222 30% 25%)",
        },
        monolith: {
          DEFAULT: "hsl(0 0% 2%)",         // The monolith black
        },
        starfield: {
          white: "hsl(0 0% 90%)",          // Star color
        },
        
        // CTF difficulty level colors
        ctf: {
          easy: "hsl(142 71% 45%)",        // Green - Easy levels
          medium: "hsl(38 92% 50%)",       // Gold - Medium levels  
          hard: "hsl(0 72% 51%)",          // HAL Red - Hard levels
          locked: "hsl(222 30% 40%)",      // Gray - Locked levels
        },
        
        // Brand colors (using console blue)
        brand: {
          50: "hsl(199 89% 95%)",
          100: "hsl(199 89% 90%)",
          200: "hsl(199 89% 80%)",
          300: "hsl(199 89% 70%)",
          400: "hsl(199 89% 60%)",
          500: "hsl(199 89% 48%)",         // Primary brand
          600: "hsl(199 89% 42%)",
          700: "hsl(199 89% 38%)",
          800: "hsl(199 89% 30%)",
          900: "hsl(199 89% 20%)",
        },
      },
      
      // =======================================================================
      // Typography
      // =======================================================================
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],  // Space-age display font
        mono: ['Space Mono', 'monospace'],     // Terminal/console font
      },
      
      // =======================================================================
      // Border Radius
      // =======================================================================
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      
      // =======================================================================
      // Animations
      // =======================================================================
      keyframes: {
        // Accordion animations
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        
        // HAL eye pulse
        "hal-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(0 72% 51% / 0.5), 0 0 40px hsl(0 72% 51% / 0.3)",
          },
          "50%": {
            boxShadow: "0 0 30px hsl(0 72% 51% / 0.7), 0 0 60px hsl(0 72% 51% / 0.5)",
          },
        },
        
        // Star twinkle
        "twinkle": {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        },
        
        // Fade in
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        
        // Slide in from right
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        
        // Glow pulse for badges
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px currentColor" },
          "50%": { boxShadow: "0 0 15px currentColor" },
        },
        
        // Console flicker
        "flicker": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.95" },
          "52%": { opacity: "1" },
          "54%": { opacity: "0.97" },
        },
      },
      
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "hal-pulse": "hal-pulse 4s ease-in-out infinite",
        "twinkle": "twinkle 3s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "flicker": "flicker 0.15s ease-in-out infinite",
      },
      
      // =======================================================================
      // Box Shadows
      // =======================================================================
      boxShadow: {
        "hal-glow": "0 0 20px hsl(0 72% 51% / 0.5), 0 0 40px hsl(0 72% 51% / 0.3)",
        "console-glow": "0 0 20px hsl(199 89% 48% / 0.5), 0 0 40px hsl(199 89% 48% / 0.3)",
        "monolith": "0 25px 50px -12px hsl(0 0% 0% / 0.5)",
      },
      
      // =======================================================================
      // Background Images
      // =======================================================================
      backgroundImage: {
        "space-gradient": "radial-gradient(ellipse at bottom, hsl(222 47% 8%) 0%, hsl(222 47% 4%) 100%)",
        "hal-gradient": "radial-gradient(circle at 30% 30%, hsl(0 72% 65%), hsl(0 72% 51%) 50%, hsl(0 72% 35%) 100%)",
        "console-gradient": "linear-gradient(135deg, hsl(199 89% 48%), hsl(199 89% 38%))",
      },
    },
  },
  
  // Plugins
  plugins: [
    require("tailwindcss-animate"),
  ],
};
