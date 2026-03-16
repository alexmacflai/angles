import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import exifr from 'exifr';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import sharp from 'sharp';

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);
const GRID_VARIANT_SIZES = [360, 640, 960, 1280, 1600];
const GRID_PREVIEW_SIZE = 48;
const LIGHTBOX_VARIANT_SIZE = 1600;
const LIGHTBOX_PREVIEW_SIZE = 64;

function getImageMimeType(extension) {
  switch (extension.toLowerCase()) {
    case '.png':
      return 'image/png';
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

function humanizeFilename(value) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTags(tags) {
  return [...new Set(tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
}

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function collectMetadataTags(metadata) {
  const values = [
    metadata?.Keywords,
    metadata?.Subject,
    metadata?.subject,
    metadata?.XPKeywords,
    metadata?.HierarchicalSubject,
  ].flatMap((value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      return value.split(/[;,|]/g);
    }

    return [];
  });

  return normalizeTags(values);
}

async function extractEmbeddedMetadata(filePath) {
  try {
    const metadata = await exifr.parse(filePath, {
      tiff: true,
      exif: false,
      iptc: true,
      xmp: true,
      icc: false,
      jfif: false,
    });

    const tags = collectMetadataTags(metadata);
    const alt = pickFirstNonEmpty(
      metadata?.Description,
      metadata?.ImageDescription,
      metadata?.Headline,
      metadata?.Title,
      metadata?.ObjectName
    );

    return { tags, alt };
  } catch {
    return { tags: [], alt: '' };
  }
}

async function hashFile(filePath) {
  const contents = await fs.readFile(filePath);
  return crypto.createHash('sha1').update(contents).digest('hex');
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

  const tags = Array.isArray(record.tags) ? normalizeTags(record.tags) : [];

  return {
    filename: record.filename.trim(),
    tags: tags.length > 0 ? tags : ['untagged'],
    alt: typeof record.alt === 'string' && record.alt.trim() ? record.alt.trim() : humanizeFilename(record.filename),
    sourceHash:
      typeof record.sourceHash === 'string' && /^[a-f0-9]{40}$/i.test(record.sourceHash.trim())
        ? record.sourceHash.trim().toLowerCase()
        : '',
  };
}

export function validateCatalog(catalog, filesOnDisk) {
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

    if (!filesOnDisk.has(record.filename)) {
      continue;
    }
  }

  const catalogByFilename = new Map(
    normalized
      .filter((record) => filesOnDisk.has(record.filename))
      .map((record) => [record.filename, record])
  );
  const synced = [];

  for (const [fileName, fileInfo] of [...filesOnDisk.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const existing = catalogByFilename.get(fileName);
    const baseRecord = existing ?? normalizeCatalogRecord({ filename: fileName });
    const shouldUseEmbeddedTags = !existing || existing.tags.length === 0 || existing.tags.includes('untagged');
    const resolvedTags = shouldUseEmbeddedTags
      ? normalizeTags(fileInfo.embeddedTags ?? [])
      : baseRecord.tags;
    const defaultAlt = humanizeFilename(fileName);
    const shouldUseEmbeddedAlt = !existing || !baseRecord.alt || baseRecord.alt === defaultAlt;
    const resolvedAlt = shouldUseEmbeddedAlt ? pickFirstNonEmpty(fileInfo.embeddedAlt, baseRecord.alt) : baseRecord.alt;

    synced.push({
      ...baseRecord,
      tags: resolvedTags.length > 0 ? resolvedTags : ['untagged'],
      alt: resolvedAlt || defaultAlt,
      sourceHash: fileInfo.sourceHash,
    });
  }

  return synced;
}

async function writeVariantFormats(image, outputBasePath) {
  await Promise.all([
    image.clone().avif({ quality: 55 }).toFile(`${outputBasePath}.avif`),
    image.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${outputBasePath}.jpg`),
  ]);
}

function buildResponsiveVariantSources(width, height, sizes) {
  const uniqueSources = new Map();

  for (const size of sizes) {
    const scaled = scaleToFit(width, height, size, size);
    const key = `${scaled.width}x${scaled.height}`;

    if (!uniqueSources.has(key)) {
      uniqueSources.set(key, scaled);
    }
  }

  return [...uniqueSources.values()].sort((left, right) => left.width - right.width || left.height - right.height);
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

  const gridSources = buildResponsiveVariantSources(metadata.width, metadata.height, GRID_VARIANT_SIZES);
  const largestGridSource = gridSources.at(-1);
  const previewDimensions = scaleToFit(metadata.width, metadata.height, GRID_PREVIEW_SIZE, GRID_PREVIEW_SIZE);
  const lightboxDimensions = scaleToFit(metadata.width, metadata.height, LIGHTBOX_VARIANT_SIZE, LIGHTBOX_VARIANT_SIZE);
  const lightboxPreviewDimensions = scaleToFit(
    metadata.width,
    metadata.height,
    LIGHTBOX_PREVIEW_SIZE,
    LIGHTBOX_PREVIEW_SIZE
  );

  if (!largestGridSource) {
    throw new Error(`Unable to build grid variants for "${record.filename}".`);
  }

  await Promise.all([
    ...gridSources.map((gridSource) =>
      writeVariantFormats(
        sourceImage.clone().resize({
          width: gridSource.width,
          height: gridSource.height,
          fit: 'inside',
          withoutEnlargement: true,
        }),
        path.join(targetDir, `grid-${gridSource.width}`)
      )
    ),
    writeVariantFormats(
      sourceImage.clone().resize({
        width: previewDimensions.width,
        height: previewDimensions.height,
        fit: 'inside',
        withoutEnlargement: true,
      }),
      path.join(targetDir, 'grid-preview')
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
    writeVariantFormats(
      sourceImage.clone().resize({
        width: lightboxPreviewDimensions.width,
        height: lightboxPreviewDimensions.height,
        fit: 'inside',
        withoutEnlargement: true,
      }),
      path.join(targetDir, 'lightbox-preview')
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
    sourceHash: record.sourceHash,
    variants: {
      grid: {
        avif: `/generated/images/${slug}/grid-${largestGridSource.width}.avif`,
        jpeg: `/generated/images/${slug}/grid-${largestGridSource.width}.jpg`,
        width: largestGridSource.width,
        height: largestGridSource.height,
        preview: {
          avif: `/generated/images/${slug}/grid-preview.avif`,
          jpeg: `/generated/images/${slug}/grid-preview.jpg`,
          width: previewDimensions.width,
          height: previewDimensions.height,
        },
        sources: gridSources.map((gridSource) => ({
          avif: `/generated/images/${slug}/grid-${gridSource.width}.avif`,
          jpeg: `/generated/images/${slug}/grid-${gridSource.width}.jpg`,
          width: gridSource.width,
          height: gridSource.height,
        })),
      },
      lightbox: {
        avif: `/generated/images/${slug}/lightbox.avif`,
        jpeg: `/generated/images/${slug}/lightbox.jpg`,
        width: lightboxDimensions.width,
        height: lightboxDimensions.height,
        preview: {
          avif: `/generated/images/${slug}/lightbox-preview.avif`,
          jpeg: `/generated/images/${slug}/lightbox-preview.jpg`,
          width: lightboxPreviewDimensions.width,
          height: lightboxPreviewDimensions.height,
        },
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

export async function buildContent(rootDir, options = {}) {
  const { onProgress } = options;
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
    fs.readFile(catalogPath, 'utf8').catch((error) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        return '[]';
      }

      throw error;
    }),
    fs.readdir(originalsDir, { withFileTypes: true }),
  ]);

  const originalFileNames = originalEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => IMAGE_EXTENSIONS.has(path.extname(fileName).toLowerCase()));

  const filesOnDisk = new Map(
    await Promise.all(
      originalFileNames.map(async (fileName) => {
        const filePath = path.join(originalsDir, fileName);
        const embeddedMetadata = await extractEmbeddedMetadata(filePath);
        return [
          fileName,
          {
            sourceHash: await hashFile(filePath),
            embeddedTags: embeddedMetadata.tags,
            embeddedAlt: embeddedMetadata.alt,
          },
        ];
      })
    )
  );

  const catalog = validateCatalog(JSON.parse(catalogRaw), filesOnDisk);
  const manifest = [];

  await fs.writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

  for (const [index, record] of catalog.entries()) {
    onProgress?.({
      current: index + 1,
      total: catalog.length,
      filename: record.filename,
    });
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
