import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          // Keep the browser host for Django's same-origin session and CSRF checks.
          changeOrigin: false,
        },
      },
    },
  };
});
