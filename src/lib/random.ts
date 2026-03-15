import type { DecoratedImage, ImageRecord, SizeClass } from '../types';

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
