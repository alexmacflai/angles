import { aboutHtml } from '../generated/about';
import type { ImageRecord, SelectionIndexRecord } from '../types';
import { withBasePath } from './base-path';
import { normalizeImageRecord } from './image-record';
import { selectImageCluster } from './selection';

async function fetchJson<T>(path: string) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load "${path}" (${response.status}).`);
  }

  return (await response.json()) as T;
}

export async function loadSelectionPageData(random = Math.random) {
  const selectionIndex = await fetchJson<SelectionIndexRecord[]>(withBasePath('generated/selection-index.json'));
  const selected = selectImageCluster(selectionIndex, { random });
  const images = await Promise.all(
    selected.map(async (image) => {
      const record = await fetchJson<ImageRecord>(withBasePath(`generated/records/${image.id}.json`));
      return normalizeImageRecord(record);
    })
  );

  return {
    about: aboutHtml,
    images,
  };
}
