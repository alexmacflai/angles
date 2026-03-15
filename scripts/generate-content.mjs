import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildContent } from './content-pipeline.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function renderProgressBar(current, total, width = 24) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.min(Math.max(current / safeTotal, 0), 1);
  const filled = Math.round(ratio * width);

  return `${'='.repeat(filled)}${'-'.repeat(Math.max(width - filled, 0))}`;
}

function createProgressReporter() {
  const isTty = Boolean(process.stdout.isTTY);

  return ({ current, total, filename }) => {
    const percentage = Math.round((current / Math.max(total, 1)) * 100);
    const line = `[${renderProgressBar(current, total)}] ${percentage}% (${current}/${total}) ${filename}`;

    if (isTty) {
      process.stdout.write(`\r${line}`);

      if (current === total) {
        process.stdout.write('\n');
      }

      return;
    }

    console.log(line);
  };
}

const manifest = await buildContent(rootDir, {
  onProgress: createProgressReporter(),
});

console.log(`Generated content for ${manifest.length} image${manifest.length === 1 ? '' : 's'}.`);
