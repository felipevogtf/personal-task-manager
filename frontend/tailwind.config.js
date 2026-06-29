/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        base:        '#f5f5f8',
        surface:     '#ffffff',
        raised:      '#f0f0f4',
        line:        '#e4e4ea',
        'line-soft': '#ededf2',
        on:          '#111118',
        dim:         '#4e4e60',
        ghost:       '#9898aa',
        tint:        '#6366f1',
        'tint-bg':   '#eef0ff',
        'tint-dark': '#4f46e5',
        warn:        '#d97706',
        bad:         '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
