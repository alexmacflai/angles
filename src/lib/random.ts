import type { DecoratedImage, GridGap, GridSlot, ImageRecord, PageMode, SizeClass } from '../types';

const GAP_RATIOS: Record<SizeClass, number> = {
  uno: 0.1,
  dos: 0.2,
  tres: 0.3,
};

export function shuffleItems<T>(items: readonly T[], random = Math.random): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function getSizeClass(random = Math.random): SizeClass {
  const roll = Math.floor(random() * 100) + 1;

  if (roll <= 60) {
    return 'uno';
  }

  if (roll <= 90) {
    return 'dos';
  }

  return 'tres';
}

export function decorateImages(images: readonly ImageRecord[], random = Math.random): DecoratedImage[] {
  return images.map((image, index) => ({
    ...image,
    index,
    sizeClass: getSizeClass(random),
  }));
}

export function buildGridSlots(
  images: readonly DecoratedImage[],
  mode: PageMode,
  random = Math.random
): GridSlot[] {
  if (mode !== 'archive') {
    return [...images];
  }

  const counts: Record<SizeClass, number> = {
    uno: 0,
    dos: 0,
    tres: 0,
  };

  images.forEach((image) => {
    counts[image.sizeClass] += 1;
  });

  const gapCounts = (Object.keys(counts) as SizeClass[]).reduce<Record<SizeClass, number>>((accumulator, sizeClass) => {
    const ratio = GAP_RATIOS[sizeClass];
    const imageCount = counts[sizeClass];
    accumulator[sizeClass] = Math.round((imageCount * ratio) / (1 - ratio));
    return accumulator;
  }, { uno: 0, dos: 0, tres: 0 });

  const insertionPoints = (Object.keys(counts) as SizeClass[]).reduce<Record<SizeClass, Set<number>>>(
    (accumulator, sizeClass) => {
      const shuffledOccurrences = shuffleItems(
        Array.from({ length: counts[sizeClass] }, (_, index) => index),
        random
      );

      accumulator[sizeClass] = new Set(shuffledOccurrences.slice(0, gapCounts[sizeClass]));
      return accumulator;
    },
    { uno: new Set<number>(), dos: new Set<number>(), tres: new Set<number>() }
  );

  const seenCounts: Record<SizeClass, number> = {
    uno: 0,
    dos: 0,
    tres: 0,
  };
  const slots: GridSlot[] = [];

  images.forEach((image) => {
    const occurrence = seenCounts[image.sizeClass];

    slots.push(image);

    if (insertionPoints[image.sizeClass].has(occurrence)) {
      const gap: GridGap = {
        kind: 'gap',
        key: `gap-${image.index}-${image.sizeClass}-${occurrence}`,
        sizeClass: image.sizeClass,
      };

      slots.push(gap);
    }

    seenCounts[image.sizeClass] += 1;
  });

  return slots;
}
