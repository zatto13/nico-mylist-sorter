import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/thumbinfo': {
        target: 'https://ext.nicovideo.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/thumbinfo/, ''),
      },
    },
  },
});