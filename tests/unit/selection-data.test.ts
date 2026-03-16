import { loadSelectionPageData } from '../../src/lib/selection-data';
import type { ImageRecord } from '../../src/types';

function createRecord(id: string, tags: string[]): ImageRecord {
  return {
    id,
    filename: `${id}.jpg`,
    slug: id,
    sourceHash: `${id}-hash`,
    width: 1200,
    height: 900,
    aspectRatio: 1.3333,
    tags,
    alt: id,
    variants: {
      grid: {
        avif: `/${id}/grid.avif`,
        jpeg: `/${id}/grid.jpg`,
        width: 1200,
        height: 900,
        preview: {
          avif: `/${id}/grid-preview.avif`,
          jpeg: `/${id}/grid-preview.jpg`,
          width: 32,
          height: 24,
        },
        sources: [{ avif: `/${id}/grid.avif`, jpeg: `/${id}/grid.jpg`, width: 1200, height: 900 }],
      },
      lightbox: {
        avif: `/${id}/lightbox.avif`,
        jpeg: `/${id}/lightbox.jpg`,
        width: 1200,
        height: 900,
        sources: [
          { avif: `/${id}/lightbox-720.avif`, jpeg: `/${id}/lightbox-720.jpg`, width: 720, height: 540 },
          { avif: `/${id}/lightbox.avif`, jpeg: `/${id}/lightbox.jpg`, width: 1200, height: 900 },
        ],
        preview: {
          avif: `/${id}/lightbox-preview.avif`,
          jpeg: `/${id}/lightbox-preview.jpg`,
          width: 40,
          height: 30,
        },
      },
      original: {
        url: `/${id}/original.jpg`,
        width: 1200,
        height: 900,
        mimeType: 'image/jpeg',
      },
    },
  };
}

describe('loadSelectionPageData', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the lightweight selection index first and then fetches the selected full records', async () => {
    const index = [
      { id: 'seed', tags: ['window', 'shadow'] },
      { id: 'match-a', tags: ['window', 'shadow'] },
      { id: 'match-b', tags: ['window'] },
      { id: 'match-c', tags: ['shadow'] },
      { id: 'bridge', tags: ['window', 'shadow'] },
      { id: 'match-d', tags: ['window', 'line'] },
      { id: 'match-e', tags: ['shadow', 'detail'] },
      { id: 'match-f', tags: ['window', 'reflection'] },
      { id: 'outsider-a', tags: ['forest'] },
      { id: 'outsider-b', tags: ['water'] },
      { id: 'outsider-c', tags: ['road'] },
    ];
    const records = new Map(index.map((image) => [image.id, createRecord(image.id, image.tags)]));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/generated/selection-index.json')) {
        return new Response(JSON.stringify(index), { status: 200 });
      }

      const match = url.match(/\/generated\/records\/(.+)\.json$/);

      if (!match) {
        return new Response('Not found', { status: 404 });
      }

      const record = records.get(match[1]);
      return new Response(JSON.stringify(record), { status: record ? 200 : 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadSelectionPageData(() => 0);

    expect(result.images).toHaveLength(6);
    expect(result.images[0].id).toBe('seed');
    expect(result.images.every((image) => !image.id.startsWith('outsider'))).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/generated/selection-index.json');
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });
});
