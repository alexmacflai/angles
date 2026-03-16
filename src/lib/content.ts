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
      jpeg: prefixPath(image.variants.grid.jpeg),
      preview: {
        ...image.variants.grid.preview,
        avif: prefixPath(image.variants.grid.preview.avif),
        jpeg: prefixPath(image.variants.grid.preview.jpeg),
      },
      sources: image.variants.grid.sources.map((source) => ({
        ...source,
        avif: prefixPath(source.avif),
        jpeg: prefixPath(source.jpeg),
      })),
    },
    lightbox: {
      ...image.variants.lightbox,
      avif: prefixPath(image.variants.lightbox.avif),
      jpeg: prefixPath(image.variants.lightbox.jpeg),
      preview: {
        ...image.variants.lightbox.preview,
        avif: prefixPath(image.variants.lightbox.preview.avif),
        jpeg: prefixPath(image.variants.lightbox.preview.jpeg),
      },
    },
    original: {
      ...image.variants.original,
      url: prefixPath(image.variants.original.url),
    },
  },
})) satisfies ImageRecord[];

export { aboutHtml, aboutMeta };
