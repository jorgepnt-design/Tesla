import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Relative Basis: läuft unter jedem Pfad, z. B. GitHub Pages unter /Tesla/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
