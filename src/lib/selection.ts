import type { ImageRecord } from '../types';
import { shuffleItems } from './random';

interface SelectionOptions {
  limit?: number;
  random?: () => number;
}

export function selectImageCluster(
  images: readonly ImageRecord[],
  { limit = 12, random = Math.random }: SelectionOptions = {}
): ImageRecord[] {
  if (images.length <= limit) {
    return [...images];
  }

  const seedIndex = Math.floor(random() * images.length);
  const seed = images[seedIndex];
  const seedTags = new Set(seed.tags);

  const shuffledRemainder = shuffleItems(
    images.filter((_, index) => index !== seedIndex),
    random
  );

  const scoredImages = shuffledRemainder
    .map((image) => ({
      image,
      overlap: image.tags.reduce((count, tag) => count + Number(seedTags.has(tag)), 0),
    }))
    .sort((left, right) => right.overlap - left.overlap)
    .map(({ image }) => image);

  return [seed, ...scoredImages.slice(0, Math.max(limit - 1, 0))];
}
