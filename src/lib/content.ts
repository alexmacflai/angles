import generatedImages from '../generated/images.json';
import { aboutHtml, aboutMeta } from '../generated/about';
import type { ImageRecord } from '../types';
import { withBasePath } from './base-path';

function prefixPath(path: string) {
  return path.startsWith('/') ? withBasePath(path) : path;
}

export const images = (generatedImages as ImageRecord[]).map((image) => ({
  ...image,
  variants: {
    grid: {
      ...image.variants.grid,
      avif: prefixPath(image.variants.grid.avif),
      webp: prefixPath(image.variants.grid.webp),
      jpeg: prefixPath(image.variants.grid.jpeg),
      sources: image.variants.grid.sources.map((source) => ({
        ...source,
        avif: prefixPath(source.avif),
        webp: prefixPath(source.webp),
        jpeg: prefixPath(source.jpeg),
      })),
    },
    lightbox: {
      ...image.variants.lightbox,
      avif: prefixPath(image.variants.lightbox.avif),
      webp: prefixPath(image.variants.lightbox.webp),
      jpeg: prefixPath(image.variants.lightbox.jpeg),
    },
    original: {
      ...image.variants.original,
      url: prefixPath(image.variants.original.url),
    },
  },
})) satisfies ImageRecord[];

export { aboutHtml, aboutMeta };
