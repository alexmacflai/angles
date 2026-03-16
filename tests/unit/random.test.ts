import { buildGridSlots, decorateImages, getSizeClass, shuffleItems } from '../../src/lib/random';
import type { DecoratedImage, ImageRecord } from '../../src/types';

const fixtureImages: ImageRecord[] = [
  {
    id: '1',
    filename: 'one.jpg',
    slug: 'one',
    width: 100,
    height: 100,
    aspectRatio: 1,
    tags: ['window'],
    alt: 'One',
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
        preview: { avif: '/one-l-preview.avif', jpeg: '/one-l-preview.jpg', width: 24, height: 24 },
      },
      original: { url: '/one-original.jpg', width: 100, height: 100, mimeType: 'image/jpeg' },
    },
  },
  {
    id: '2',
    filename: 'two.jpg',
    slug: 'two',
    width: 100,
    height: 100,
    aspectRatio: 1,
    tags: ['shadow'],
    alt: 'Two',
    variants: {
      grid: {
        avif: '/two-100.avif',
        jpeg: '/two-100.jpg',
        width: 100,
        height: 100,
        preview: { avif: '/two-preview.avif', jpeg: '/two-preview.jpg', width: 24, height: 24 },
        sources: [{ avif: '/two-100.avif', jpeg: '/two-100.jpg', width: 100, height: 100 }],
      },
      lightbox: {
        avif: '/two-l.avif',
        jpeg: '/two-l.jpg',
        width: 100,
        height: 100,
        preview: { avif: '/two-l-preview.avif', jpeg: '/two-l-preview.jpg', width: 24, height: 24 },
      },
      original: { url: '/two-original.jpg', width: 100, height: 100, mimeType: 'image/jpeg' },
    },
  },
  {
    id: '3',
    filename: 'three.jpg',
    slug: 'three',
    width: 100,
    height: 100,
    aspectRatio: 1,
    tags: ['geometry'],
    alt: 'Three',
    variants: {
      grid: {
        avif: '/three-100.avif',
        jpeg: '/three-100.jpg',
        width: 100,
        height: 100,
        preview: { avif: '/three-preview.avif', jpeg: '/three-preview.jpg', width: 24, height: 24 },
        sources: [
          { avif: '/three-100.avif', jpeg: '/three-100.jpg', width: 100, height: 100 },
        ],
      },
      lightbox: {
        avif: '/three-l.avif',
        jpeg: '/three-l.jpg',
        width: 100,
        height: 100,
        preview: { avif: '/three-l-preview.avif', jpeg: '/three-l-preview.jpg', width: 24, height: 24 },
      },
      original: { url: '/three-original.jpg', width: 100, height: 100, mimeType: 'image/jpeg' },
    },
  },
];

describe('random helpers', () => {
  it('shuffles items deterministically when a random function is provided', () => {
    const sequence = [0.9, 0.1, 0.4];
    const shuffled = shuffleItems(fixtureImages, () => sequence.shift() ?? 0);

    expect(shuffled.map((image) => image.id)).toEqual(['2', '1', '3']);
  });

  it('returns only supported size classes', () => {
    expect(getSizeClass(() => 0.1)).toBe('uno');
    expect(getSizeClass(() => 0.7)).toBe('dos');
    expect(getSizeClass(() => 0.95)).toBe('tres');
  });

  it('decorates images with indices and size classes', () => {
    const decorated = decorateImages(fixtureImages, () => 0.1);

    expect(decorated).toHaveLength(3);
    expect(decorated[0]).toMatchObject({ index: 0, sizeClass: 'uno' });
    expect(decorated[2]).toMatchObject({ index: 2, sizeClass: 'uno' });
  });

  it('adds archive gaps using the configured per-size ratios', () => {
    const decorated: DecoratedImage[] = Array.from({ length: 10 }, (_, index) => ({
      ...fixtureImages[index % fixtureImages.length],
      id: `uno-${index}`,
      filename: `uno-${index}.jpg`,
      slug: `uno-${index}`,
      sourceHash: `uno-${index}-hash`,
      index,
      sizeClass: 'uno',
    })).concat(
      Array.from({ length: 8 }, (_, index) => ({
        ...fixtureImages[index % fixtureImages.length],
        id: `dos-${index}`,
        filename: `dos-${index}.jpg`,
        slug: `dos-${index}`,
        sourceHash: `dos-${index}-hash`,
        index: index + 10,
        sizeClass: 'dos' as const,
      })),
      Array.from({ length: 7 }, (_, index) => ({
        ...fixtureImages[index % fixtureImages.length],
        id: `tres-${index}`,
        filename: `tres-${index}.jpg`,
        slug: `tres-${index}`,
        sourceHash: `tres-${index}-hash`,
        index: index + 18,
        sizeClass: 'tres' as const,
      }))
    );

    const slots = buildGridSlots(decorated, 'archive', () => 0.2);
    const gapCounts = slots.reduce<Record<string, number>>((accumulator, slot) => {
      if ('kind' in slot && slot.kind === 'gap') {
        accumulator[slot.sizeClass] = (accumulator[slot.sizeClass] ?? 0) + 1;
      }

      return accumulator;
    }, {});

    expect(gapCounts).toEqual({
      uno: 1,
      dos: 2,
      tres: 3,
    });
  });

  it('does not add gaps outside archive mode', () => {
    const decorated = decorateImages(fixtureImages, () => 0.7);

    expect(buildGridSlots(decorated, 'selection', () => 0.2)).toEqual(decorated);
  });
});
