import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // ▼ ここを追加（GitHubのリポジトリ名が 'nico-mylist-sorter' ならこう書く）
  base: '/nico-mylist-sorter/', 
});