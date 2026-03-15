import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import sharp from 'sharp';

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);

function getImageMimeType(extension) {
  switch (extension.toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.avif':
      return 'image/avif';
    default:
      return 'image/jpeg';
  }
}

export function slugifyFilename(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function scaleToFit(width, height, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function normalizeCatalogRecord(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('Catalog records must be objects.');
  }

  if (typeof record.filename !== 'string' || !record.filename.trim()) {
    throw new Error('Every catalog record requires a filename.');
  }

  if (!Array.isArray(record.tags) || record.tags.length === 0) {
    throw new Error(`Image "${record.filename}" must include at least one tag.`);
  }

  const tags = [...new Set(record.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];

  if (tags.length === 0) {
    throw new Error(`Image "${record.filename}" must include at least one non-empty tag.`);
  }

  return {
    filename: record.filename.trim(),
    tags,
    alt: typeof record.alt === 'string' ? record.alt.trim() : '',
  };
}

export function validateCatalog(catalog, fileNames) {
  if (!Array.isArray(catalog)) {
    throw new Error('Image catalog must be an array.');
  }

  const normalized = catalog.map(normalizeCatalogRecord);
  const seen = new Set();

  for (const record of normalized) {
    if (seen.has(record.filename)) {
      throw new Error(`Duplicate filename in catalog: "${record.filename}".`);
    }

    seen.add(record.filename);

    if (!fileNames.has(record.filename)) {
      throw new Error(`Catalog image "${record.filename}" does not exist in originals.`);
    }
  }

  for (const fileName of fileNames) {
    if (!seen.has(fileName)) {
      throw new Error(`Original image "${fileName}" is missing metadata in catalog.json.`);
    }
  }

  return normalized;
}

async function writeVariantFormats(image, outputBasePath) {
  await Promise.all([
    image.clone().avif({ quality: 55 }).toFile(`${outputBasePath}.avif`),
    image.clone().webp({ quality: 80 }).toFile(`${outputBasePath}.webp`),
    image.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${outputBasePath}.jpg`),
  ]);
}

async function createImageVariants({ record, originalsDir, outputDir }) {
  const sourcePath = path.join(originalsDir, record.filename);
  const baseName = path.parse(record.filename).name;
  const extension = path.extname(record.filename);
  const slug = slugifyFilename(baseName);
  const imageId = crypto.createHash('sha1').update(record.filename).digest('hex').slice(0, 12);
  const targetDir = path.join(outputDir, slug);

  await fs.mkdir(targetDir, { recursive: true });

  const sourceImage = sharp(sourcePath).rotate();
  const metadata = await sourceImage.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read dimensions for "${record.filename}".`);
  }

  const gridDimensions = scaleToFit(metadata.width, metadata.height, 1400, 1400);
  const lightboxDimensions = scaleToFit(metadata.width, metadata.height, 1800, 1800);

  await Promise.all([
    writeVariantFormats(
      sourceImage.clone().resize({
        width: gridDimensions.width,
        height: gridDimensions.height,
        fit: 'inside',
        withoutEnlargement: true,
      }),
      path.join(targetDir, 'grid')
    ),
    writeVariantFormats(
      sourceImage.clone().resize({
        width: lightboxDimensions.width,
        height: lightboxDimensions.height,
        fit: 'inside',
        withoutEnlargement: true,
      }),
      path.join(targetDir, 'lightbox')
    ),
    fs.copyFile(sourcePath, path.join(targetDir, `original${extension.toLowerCase()}`)),
  ]);

  return {
    id: imageId,
    filename: record.filename,
    slug,
    width: metadata.width,
    height: metadata.height,
    aspectRatio: Number((metadata.width / metadata.height).toFixed(4)),
    tags: record.tags,
    alt: record.alt,
    variants: {
      grid: {
        avif: `/generated/images/${slug}/grid.avif`,
        webp: `/generated/images/${slug}/grid.webp`,
        jpeg: `/generated/images/${slug}/grid.jpg`,
        width: gridDimensions.width,
        height: gridDimensions.height,
      },
      lightbox: {
        avif: `/generated/images/${slug}/lightbox.avif`,
        webp: `/generated/images/${slug}/lightbox.webp`,
        jpeg: `/generated/images/${slug}/lightbox.jpg`,
        width: lightboxDimensions.width,
        height: lightboxDimensions.height,
      },
      original: {
        url: `/generated/images/${slug}/original${extension.toLowerCase()}`,
        width: metadata.width,
        height: metadata.height,
        mimeType: getImageMimeType(extension),
      },
    },
  };
}

async function writeAboutModule({ aboutPath, outputPath, imageCount }) {
  const rawMarkdown = await fs.readFile(aboutPath, 'utf8');
  const { data, content } = matter(rawMarkdown);
  const rendered = markdown.render(content.replaceAll('{{imageCount}}', String(imageCount)));
  const moduleSource = `export const aboutMeta = ${JSON.stringify(data, null, 2)};\nexport const aboutHtml = ${JSON.stringify(rendered)};\n`;

  await fs.writeFile(outputPath, moduleSource, 'utf8');
}

export async function buildContent(rootDir) {
  const contentDir = path.join(rootDir, 'content');
  const catalogPath = path.join(contentDir, 'images', 'catalog.json');
  const originalsDir = path.join(contentDir, 'images', 'originals');
  const aboutPath = path.join(contentDir, 'about.md');
  const generatedDir = path.join(rootDir, 'src', 'generated');
  const outputDir = path.join(rootDir, 'public', 'generated', 'images');

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const [catalogRaw, originalEntries] = await Promise.all([
    fs.readFile(catalogPath, 'utf8'),
    fs.readdir(originalsDir, { withFileTypes: true }),
  ]);

  const originalFileNames = new Set(
    originalEntries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase()))
  );

  const catalog = validateCatalog(JSON.parse(catalogRaw), originalFileNames);
  const manifest = [];

  for (const record of catalog) {
    manifest.push(await createImageVariants({ record, originalsDir, outputDir }));
  }

  await Promise.all([
    fs.writeFile(path.join(generatedDir, 'images.json'), JSON.stringify(manifest, null, 2), 'utf8'),
    writeAboutModule({
      aboutPath,
      outputPath: path.join(generatedDir, 'about.ts'),
      imageCount: manifest.length,
    }),
  ]);

  return manifest;
}
