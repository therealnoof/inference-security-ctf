// =============================================================================
// PostCSS Configuration
// =============================================================================
// PostCSS processes your CSS files. This config tells it to:
// 1. Run Tailwind CSS to generate utility classes
// 2. Run Autoprefixer to add browser-specific prefixes (like -webkit-)
// =============================================================================

module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
