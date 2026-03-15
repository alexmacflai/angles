import { selectImageCluster } from '../../src/lib/selection';
import type { ImageRecord } from '../../src/types';

function createImage(id: string, tags: string[]): ImageRecord {
  return {
    id,
    filename: `${id}.jpg`,
    slug: id,
    width: 100,
    height: 100,
    aspectRatio: 1,
    tags,
    alt: id,
    variants: {
      grid: { avif: `/${id}.avif`, webp: `/${id}.webp`, jpeg: `/${id}.jpg`, width: 100, height: 100 },
      lightbox: { avif: `/${id}-l.avif`, webp: `/${id}-l.webp`, jpeg: `/${id}-l.jpg`, width: 100, height: 100 },
      original: { url: `/${id}-original.jpg`, width: 100, height: 100, mimeType: 'image/jpeg' },
    },
  };
}

describe('selectImageCluster', () => {
  it('returns the seed image first and prioritizes the strongest overlaps', () => {
    const images = [
      createImage('seed', ['window', 'shadow', 'light']),
      createImage('best-match', ['window', 'shadow']),
      createImage('second-best', ['window']),
      createImage('no-overlap-a', ['forest']),
      createImage('no-overlap-b', ['water']),
    ];

    const selected = selectImageCluster(images, { limit: 4, random: () => 0 });

    expect(selected.map((image) => image.id)).toEqual([
      'seed',
      'best-match',
      'second-best',
      'no-overlap-a',
    ]);
  });

  it('fills the remainder with the shuffled leftover images when overlaps are sparse', () => {
    const images = [
      createImage('seed', ['window']),
      createImage('other-a', ['forest']),
      createImage('other-b', ['water']),
      createImage('other-c', ['road']),
    ];

    const sequence = [0, 0.7, 0.2, 0.9];
    const selected = selectImageCluster(images, {
      limit: 4,
      random: () => sequence.shift() ?? 0,
    });

    expect(selected).toHaveLength(4);
    expect(selected[0].id).toBe('seed');
    expect(new Set(selected.map((image) => image.id)).size).toBe(4);
  });
});
