import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildContent } from './content-pipeline.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const manifest = await buildContent(rootDir);

console.log(`Generated content for ${manifest.length} image${manifest.length === 1 ? '' : 's'}.`);
