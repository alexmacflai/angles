import { resolve } from 'node:path';
import { defineConfig } from 'vite';

function getBasePath() {
  const configuredBase = process.env.VITE_BASE_PATH;

  if (configuredBase) {
    return configuredBase.endsWith('/') ? configuredBase : `${configuredBase}/`;
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];

  if (process.env.GITHUB_ACTIONS === 'true' && repositoryName) {
    return `/${repositoryName}/`;
  }

  return '/';
}

export default defineConfig({
  base: getBasePath(),
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
