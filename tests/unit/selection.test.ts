import { selectImageCluster } from '../../src/lib/selection';
import type { ImageRecord } from '../../src/types';

function createImage(id: string, tags: string[]): ImageRecord {
  return {
    id,
    filename: `${id}.jpg`,
    slug: id,
    sourceHash: `${id}-hash`,
    width: 100,
    height: 100,
    aspectRatio: 1,
    tags,
    alt: id,
    variants: {
      grid: {
        avif: `/${id}-100.avif`,
        jpeg: `/${id}-100.jpg`,
        width: 100,
        height: 100,
        preview: { avif: `/${id}-preview.avif`, jpeg: `/${id}-preview.jpg`, width: 24, height: 24 },
        sources: [
          { avif: `/${id}-100.avif`, jpeg: `/${id}-100.jpg`, width: 100, height: 100 },
        ],
      },
      lightbox: {
        avif: `/${id}-l.avif`,
        jpeg: `/${id}-l.jpg`,
        width: 100,
        height: 100,
        preview: { avif: `/${id}-l-preview.avif`, jpeg: `/${id}-l-preview.jpg`, width: 24, height: 24 },
      },
      original: { url: `/${id}-original.jpg`, width: 100, height: 100, mimeType: 'image/jpeg' },
    },
  };
}

describe('selectImageCluster', () => {
  it('keeps the seed first and builds a cohesive pool before sampling the final series', () => {
    const images = [
      createImage('seed', ['window', 'shadow']),
      createImage('match-a', ['window', 'shadow']),
      createImage('match-b', ['window']),
      createImage('match-c', ['shadow']),
      createImage('cohesive-bridge', ['window', 'shadow']),
      createImage('outsider-a', ['forest']),
      createImage('outsider-b', ['water']),
      createImage('outsider-c', ['road']),
    ];

    const selected = selectImageCluster(images, { limit: 4, poolSize: 5, random: () => 0 });

    expect(selected[0].id).toBe('seed');
    expect(selected).toHaveLength(4);
    expect(new Set(selected.map((image) => image.id)).size).toBe(4);
    expect(selected.every((image) => !image.id.startsWith('outsider'))).toBe(true);
  });

  it('returns all images when the total count is already at or below the final limit', () => {
    const images = [
      createImage('seed', ['window']),
      createImage('other-a', ['forest']),
      createImage('other-b', ['water']),
      createImage('other-c', ['road']),
    ];

    const selected = selectImageCluster(images, { limit: 6, random: () => 0.2 });
    expect(selected).toHaveLength(4);
    expect(selected.map((image) => image.id)).toEqual(['seed', 'other-a', 'other-b', 'other-c']);
  });

  it('samples a smaller final series from a larger cohesive pool', () => {
    const images = [
      createImage('seed', ['window', 'shadow']),
      createImage('match-a', ['window', 'shadow']),
      createImage('match-b', ['window']),
      createImage('match-c', ['shadow']),
      createImage('match-d', ['window', 'shadow']),
      createImage('match-e', ['window']),
      createImage('match-f', ['shadow']),
      createImage('outsider', ['forest']),
    ];

    const sequence = [0, 0.9, 0.1, 0.8, 0.2, 0.7, 0.3];
    const selected = selectImageCluster(images, {
      limit: 3,
      poolSize: 6,
      random: () => sequence.shift() ?? 0.4,
    });

    expect(selected).toHaveLength(3);
    expect(selected[0].id).toBe('seed');
    expect(selected.every((image) => image.id !== 'outsider')).toBe(true);
  });
});
