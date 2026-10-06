import { defineConfig } from 'vite';

export default defineConfig({
  // If your repo is https://github.com/agoodtaco/fur-website,
  // the site lives at https://agoodtaco.github.io/fur-website/
  // so base must be '/fur-website/'.
  // If you use a custom domain, set base to '/'.
  base: '/fur-website/',

  // Keep COOP/COEP for local dev. On GitHub Pages, coi-serviceworker
  // provides these headers at runtime instead.
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  optimizeDeps: {
    exclude: ['meshfix-wasm', '@polydera/trueform'],
  },

  worker: {
    format: 'es',
  },

  build: {
    target: 'es2022',
    assetsInlineLimit: 0, // WASM must stay as separate files
  },
});