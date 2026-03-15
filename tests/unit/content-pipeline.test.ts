import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import { buildContent, validateCatalog } from '../../scripts/content-pipeline.mjs';

async function makeTempProject() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'angles-content-'));
  await fs.mkdir(path.join(rootDir, 'content', 'images', 'originals'), { recursive: true });
  await fs.mkdir(path.join(rootDir, 'public'), { recursive: true });

  await sharp({
    create: {
      width: 40,
      height: 30,
      channels: 3,
      background: { r: 32, g: 32, b: 32 },
    },
  })
    .jpeg()
    .toFile(path.join(rootDir, 'content', 'images', 'originals', 'sample.jpg'));

  await fs.writeFile(
    path.join(rootDir, 'content', 'images', 'catalog.json'),
    JSON.stringify([{ filename: 'sample.jpg', tags: ['window'], alt: 'Sample' }], null, 2),
    'utf8'
  );

  await fs.writeFile(path.join(rootDir, 'content', 'about.md'), 'Hello {{imageCount}}', 'utf8');

  return rootDir;
}

describe('content pipeline', () => {
  it('rejects duplicate filenames in the catalog', () => {
    expect(() =>
      validateCatalog(
        [
          { filename: 'sample.jpg', tags: ['window'] },
          { filename: 'sample.jpg', tags: ['shadow'] },
        ],
        new Set(['sample.jpg'])
      )
    ).toThrow(/Duplicate filename/);
  });

  it('rejects empty tag arrays', () => {
    expect(() =>
      validateCatalog([{ filename: 'sample.jpg', tags: [] }], new Set(['sample.jpg']))
    ).toThrow(/at least one tag/);
  });

  it('rejects images that exist on disk but are missing metadata', () => {
    expect(() =>
      validateCatalog([{ filename: 'sample.jpg', tags: ['window'] }], new Set(['sample.jpg', 'extra.jpg']))
    ).toThrow(/missing metadata/);
  });

  it('builds the manifest and replaces the markdown image-count token', async () => {
    const rootDir = await makeTempProject();

    const manifest = await buildContent(rootDir);
    const imagesJson = await fs.readFile(path.join(rootDir, 'src', 'generated', 'images.json'), 'utf8');
    const aboutModule = await fs.readFile(path.join(rootDir, 'src', 'generated', 'about.ts'), 'utf8');

    expect(manifest).toHaveLength(1);
    expect(JSON.parse(imagesJson)[0]).toMatchObject({
      filename: 'sample.jpg',
      tags: ['window'],
    });
    expect(aboutModule).toContain('Hello 1');
  });
});
