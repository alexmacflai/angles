import { getGridSizes, getLightboxSizes } from '../../src/lib/render';
import type { DecoratedImage } from '../../src/types';

const baseImage: DecoratedImage = {
  id: '1',
  filename: 'one.jpg',
  slug: 'one',
  sourceHash: 'hash-1',
  width: 100,
  height: 100,
  aspectRatio: 1,
  tags: [],
  alt: 'One',
  index: 0,
  sizeClass: 'uno',
  variants: {
    grid: {
      avif: '/one-100.avif',
      jpeg: '/one-100.jpg',
      width: 100,
      height: 100,
      preview: { avif: '/one-preview.avif', jpeg: '/one-preview.jpg', width: 24, height: 24 },
      sources: [{ avif: '/one-100.avif', jpeg: '/one-100.jpg', width: 100, height: 100 }],
    },
    lightbox: {
      avif: '/one-l.avif',
      jpeg: '/one-l.jpg',
      width: 100,
      height: 100,
      sources: [
        { avif: '/one-l-64.avif', jpeg: '/one-l-64.jpg', width: 64, height: 64 },
        { avif: '/one-l.avif', jpeg: '/one-l.jpg', width: 100, height: 100 },
      ],
      preview: { avif: '/one-l-preview.avif', jpeg: '/one-l-preview.jpg', width: 24, height: 24 },
    },
    original: { url: '/one-original.jpg', width: 100, height: 100, mimeType: 'image/jpeg' },
  },
};

describe('render helpers', () => {
  it('uses half-width sizes for archive uno tiles between 501px and 767px', () => {
    expect(getGridSizes(baseImage, 'archive')).toBe(
      '(max-width: 500px) 50vw, (max-width: 767px) 50vw, (max-width: 1279px) 25vw, 20vw'
    );
  });

  it('keeps wide archive tiles full-width below 768px', () => {
    expect(getGridSizes({ ...baseImage, sizeClass: 'dos' }, 'archive')).toBe(
      '(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 40vw'
    );
    expect(getGridSizes({ ...baseImage, sizeClass: 'tres' }, 'archive')).toBe(
      '(max-width: 767px) 100vw, (max-width: 1279px) 75vw, 60vw'
    );
  });

  it('uses responsive lightbox sizing across breakpoints', () => {
    expect(getLightboxSizes()).toBe(
      '(max-width: 767px) calc(100vw - 2rem), (max-width: 1023px) calc(100vw - 3rem), calc(100vw - 4rem)'
    );
  });
});
