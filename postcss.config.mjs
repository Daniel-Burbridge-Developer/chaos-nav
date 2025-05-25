// postcss.config.mjs
import tailwindcss from 'tailwindcss'; // Import plugins if needed
import autoprefixer from 'autoprefixer';
import postcssImport from 'postcss-import'; // Import postcss-import

export default {
  plugins: {
    'postcss-import': postcssImport, // Use the imported plugin
    tailwindcss: tailwindcss, // Use the imported plugin
    autoprefixer: autoprefixer, // Use the imported plugin
  },
};
