/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1DB954',
          greenHover: '#1ed760',
          black: '#000000',
          base: '#121212',
          elevated: '#181818',
          highlight: '#282828',
          subtle: '#b3b3b3',
        },
      },
      fontFamily: {
        sans: [
          'Circular',
          'Spotify Circular',
          '-apple-system',
          'BlinkMacSystemFont',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
