import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // GitHub Pages serves a project site from /<repo>/, not from the domain root, so every asset
  // URL needs that prefix. Set by the deploy workflow; empty locally and for a user/org site.
  // Routing is already HashRouter, so deep links need no server-side rewrite rule.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src'), '~data': path.resolve(import.meta.dirname, 'data') } },
});
