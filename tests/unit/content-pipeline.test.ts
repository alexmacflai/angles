import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import sharp from 'sharp';

import { buildContent, validateCatalog } from '../../scripts/content-pipeline.mjs';

const SAMPLE_HASH = 'b7f783baed8297f0db3cfaab512fd0150d678cb9';
const EXTRA_HASH = '0f228715f94042053bc7f272e4ee44eb4b7e93c4';

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
        new Map([['sample.jpg', { sourceHash: SAMPLE_HASH }]])
      )
    ).toThrow(/Duplicate filename/);
  });

  it('rejects empty tag arrays', () => {
    expect(
      validateCatalog([{ filename: 'sample.jpg', tags: [] }], new Map([['sample.jpg', { sourceHash: SAMPLE_HASH }]]))
    ).toEqual([{ filename: 'sample.jpg', tags: ['untagged'], alt: 'sample', sourceHash: SAMPLE_HASH }]);
  });

  it('auto-adds images that exist on disk but are missing metadata', () => {
    expect(
      validateCatalog(
        [{ filename: 'sample.jpg', tags: ['window'] }],
        new Map([
          ['sample.jpg', { sourceHash: SAMPLE_HASH }],
          ['extra.jpg', { sourceHash: EXTRA_HASH }],
        ])
      )
    ).toEqual([
      { filename: 'extra.jpg', tags: ['untagged'], alt: 'extra', sourceHash: EXTRA_HASH },
      { filename: 'sample.jpg', tags: ['window'], alt: 'sample', sourceHash: SAMPLE_HASH },
    ]);
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

  it('syncs catalog.json with discovered images and default metadata', async () => {
    const rootDir = await makeTempProject();

    await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: { r: 64, g: 64, b: 64 },
      },
    })
      .jpeg()
      .toFile(path.join(rootDir, 'content', 'images', 'originals', 'new-upload.jpg'));

    await buildContent(rootDir);

    const catalogJson = await fs.readFile(path.join(rootDir, 'content', 'images', 'catalog.json'), 'utf8');
    expect(JSON.parse(catalogJson)).toEqual([
      expect.objectContaining({ filename: 'new-upload.jpg', tags: ['untagged'], alt: 'new upload' }),
      expect.objectContaining({ filename: 'sample.jpg', tags: ['window'], alt: 'Sample' }),
    ]);
  });

  it('updates the stored hash when an existing filename is replaced', async () => {
    const rootDir = await makeTempProject();

    await buildContent(rootDir);
    const originalCatalog = JSON.parse(
      await fs.readFile(path.join(rootDir, 'content', 'images', 'catalog.json'), 'utf8')
    );

    await sharp({
      create: {
        width: 90,
        height: 60,
        channels: 3,
        background: { r: 255, g: 128, b: 0 },
      },
    })
      .jpeg()
      .toFile(path.join(rootDir, 'content', 'images', 'originals', 'sample.jpg'));

    const manifest = await buildContent(rootDir);
    const updatedCatalog = JSON.parse(
      await fs.readFile(path.join(rootDir, 'content', 'images', 'catalog.json'), 'utf8')
    );

    expect(updatedCatalog[0].sourceHash).not.toEqual(originalCatalog[0].sourceHash);
    expect(updatedCatalog[0]).toMatchObject({
      filename: 'sample.jpg',
      tags: ['window'],
      alt: 'Sample',
    });
    expect(manifest[0].sourceHash).toEqual(updatedCatalog[0].sourceHash);
    expect(manifest[0]).toMatchObject({
      filename: 'sample.jpg',
      width: 90,
      height: 60,
    });
  });
});
