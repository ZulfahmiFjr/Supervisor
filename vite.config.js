import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 8080, // biar sama kyak port lama
    host: true  // biar bisa diakses dari LAN (HP)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});