import type { ImageRecord } from '../types';
import { shuffleItems } from './random';

interface SelectionOptions {
  limit?: number;
  poolSize?: number;
  random?: () => number;
}

function scoreOverlap(baseTags: ReadonlySet<string>, image: ImageRecord) {
  return image.tags.reduce((count, tag) => count + Number(baseTags.has(tag)), 0);
}

function scoreCohesion(pool: readonly ImageRecord[], candidate: ImageRecord) {
  return pool.reduce((total, image) => total + scoreOverlap(new Set(image.tags), candidate), 0);
}

export function selectImageCluster(
  images: readonly ImageRecord[],
  { limit = 6, poolSize = 18, random = Math.random }: SelectionOptions = {}
): ImageRecord[] {
  if (images.length <= limit) {
    return [...images];
  }

  const seedIndex = Math.floor(random() * images.length);
  const seed = images[seedIndex];
  const remainder = images.filter((_, index) => index !== seedIndex);
  const shuffledRemainder = shuffleItems(remainder, random);
  const cohesivePool = [seed];
  const targetPoolSize = Math.min(poolSize, images.length);

  while (cohesivePool.length < targetPoolSize && shuffledRemainder.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const [index, image] of shuffledRemainder.entries()) {
      const cohesion = scoreCohesion(cohesivePool, image);

      if (cohesion > bestScore) {
        bestScore = cohesion;
        bestIndex = index;
      }
    }

    cohesivePool.push(shuffledRemainder.splice(bestIndex, 1)[0]);
  }

  if (cohesivePool.length <= limit) {
    return cohesivePool;
  }

  const randomizedPool = shuffleItems(cohesivePool.slice(1), random);
  return [seed, ...randomizedPool.slice(0, Math.max(limit - 1, 0))];
}
