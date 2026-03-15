import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        selection: resolve(__dirname, 'selection/index.html'),
      },
      output: {
        manualChunks: {
          animation: ['gsap', 'gsap/ScrollTrigger', 'lottie-web'],
        },
      },
    },
  },
});
